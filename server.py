from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json
from datetime import datetime, timezone
import os

app = Flask(__name__)

app.secret_key = os.environ.get(
    "BLDM_SECRET_KEY",
    "bldm-chave-temporaria-trocar-depois"
)

DATABASE_URL = os.environ.get("DATABASE_URL")

TVBOX_TOKEN = os.environ.get(
    "TVBOX_TOKEN",
    "6oPzCjgW6B8wRqwCDfNrM8-xHXYfqXqNK45Y05RJ5ng"
)

TVBOX_TIMEOUT_SEGUNDOS = 90


def conectar():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def iniciar_banco():
    conexao = conectar()

    conexao.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            senha TEXT NOT NULL
        )
    """)

    conexao.execute("""
        CREATE TABLE IF NOT EXISTS eventos (
            id SERIAL PRIMARY KEY,
            titulo TEXT NOT NULL,
            data TEXT NOT NULL,
            hora TEXT,
            descricao TEXT NOT NULL
        )
    """)

    conexao.execute("""
        CREATE TABLE IF NOT EXISTS tvbox_status (
            id INTEGER PRIMARY KEY DEFAULT 1,
            atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
            dados JSONB NOT NULL,
            CONSTRAINT tvbox_status_linha_unica CHECK (id = 1)
        )
    """)

    admin = conexao.execute(
        "SELECT id FROM admins LIMIT 1"
    ).fetchone()

    if admin is None:
        conexao.execute(
            "INSERT INTO admins (nome, senha) VALUES (%s, %s)",
            (
                "Administrador",
                generate_password_hash("bldm123")
            )
        )

    conexao.commit()
    conexao.close()


# =========================
# SITE
# =========================

@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def arquivos(filename):
    return send_from_directory(".", filename)


# =========================
# LOGIN
# =========================

@app.route("/api/login", methods=["POST"])
def login():

    dados = request.get_json() or {}
    senha = dados.get("senha", "")

    conexao = conectar()

    admin = conexao.execute(
        "SELECT * FROM admins LIMIT 1"
    ).fetchone()

    conexao.close()

    if admin and check_password_hash(admin["senha"], senha):

        session["admin_id"] = admin["id"]

        return jsonify({
            "sucesso": True,
            "mensagem": "Login realizado."
        })

    return jsonify({
        "sucesso": False,
        "mensagem": "Senha incorreta."
    }), 401


@app.route("/api/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "sucesso": True
    })


@app.route("/api/status", methods=["GET"])
def status():

    return jsonify({
        "logado": "admin_id" in session
    })


# =========================
# EVENTOS
# =========================

@app.route("/api/eventos", methods=["GET"])
def listar_eventos():

    conexao = conectar()

    eventos = conexao.execute("""
        SELECT id, titulo, data, hora, descricao
        FROM eventos
        ORDER BY data ASC, hora ASC
    """).fetchall()

    conexao.close()

    return jsonify([
        dict(evento)
        for evento in eventos
    ])


@app.route("/api/eventos", methods=["POST"])
def criar_evento():

    if "admin_id" not in session:
        return jsonify({
            "erro": "Não autorizado."
        }), 401

    dados = request.get_json() or {}

    titulo = dados.get("titulo", "").strip()
    data = dados.get("data", "").strip()
    hora = dados.get("hora", "").strip()
    descricao = dados.get("descricao", "").strip()

    if not titulo or not data or not descricao:
        return jsonify({
            "erro": "Preencha título, data e descrição."
        }), 400

    conexao = conectar()

    cursor = conexao.execute("""
        INSERT INTO eventos
        (titulo, data, hora, descricao)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """, (
        titulo,
        data,
        hora,
        descricao
    ))

    conexao.commit()

    evento_id = cursor.fetchone()["id"]

    conexao.close()

    return jsonify({
        "sucesso": True,
        "id": evento_id
    })


@app.route("/api/eventos/<int:evento_id>", methods=["PUT"])
def editar_evento(evento_id):

    if "admin_id" not in session:
        return jsonify({
            "erro": "Não autorizado."
        }), 401

    dados = request.get_json() or {}

    titulo = dados.get("titulo", "").strip()
    data = dados.get("data", "").strip()
    hora = dados.get("hora", "").strip()
    descricao = dados.get("descricao", "").strip()

    if not titulo or not data or not descricao:
        return jsonify({
            "erro": "Preencha título, data e descrição."
        }), 400

    conexao = conectar()

    cursor = conexao.execute("""
        UPDATE eventos
        SET titulo = ?,
            data = ?,
            hora = ?,
            descricao = ?
        WHERE id = %s
    """, (
        titulo,
        data,
        hora,
        descricao,
        evento_id
    ))

    conexao.commit()

    alterado = cursor.rowcount

    conexao.close()

    if alterado == 0:
        return jsonify({
            "erro": "Evento não encontrado."
        }), 404

    return jsonify({
        "sucesso": True
    })


@app.route("/api/eventos/<int:evento_id>", methods=["DELETE"])
def excluir_evento(evento_id):

    if "admin_id" not in session:
        return jsonify({
            "erro": "Não autorizado."
        }), 401

    conexao = conectar()

    cursor = conexao.execute(
        "DELETE FROM eventos WHERE id = %s",
        (evento_id,)
    )

    conexao.commit()

    excluido = cursor.rowcount

    conexao.close()

    if excluido == 0:
        return jsonify({
            "erro": "Evento não encontrado."
        }), 404

    return jsonify({
        "sucesso": True
    })


# =========================
# TVBOX (STATUS REMOTO)
# =========================

@app.route("/api/tvbox/heartbeat", methods=["POST"])
def tvbox_heartbeat():

    token = request.headers.get("X-TVBOX-TOKEN", "")

    if token != TVBOX_TOKEN:
        return jsonify({
            "erro": "Token inválido."
        }), 401

    dados = request.get_json() or {}

    conexao = conectar()

    conexao.execute("""
        INSERT INTO tvbox_status (id, atualizado_em, dados)
        VALUES (1, now(), %s)
        ON CONFLICT (id) DO UPDATE
        SET atualizado_em = now(),
            dados = EXCLUDED.dados
    """, (Json(dados),))

    conexao.commit()
    conexao.close()

    return jsonify({
        "sucesso": True
    })


@app.route("/api/tvbox/status", methods=["GET"])
def tvbox_status():

    conexao = conectar()

    linha = conexao.execute(
        "SELECT atualizado_em, dados FROM tvbox_status WHERE id = 1"
    ).fetchone()

    conexao.close()

    if linha is None:
        return jsonify({
            "online": False,
            "atualizado_em": None,
            "dados": None
        })

    agora = datetime.now(timezone.utc)

    segundos_desde_ultimo_ping = (
        agora - linha["atualizado_em"]
    ).total_seconds()

    online = segundos_desde_ultimo_ping <= TVBOX_TIMEOUT_SEGUNDOS

    return jsonify({
        "online": online,
        "atualizado_em": linha["atualizado_em"].isoformat(),
        "segundos_desde_ultimo_ping": segundos_desde_ultimo_ping,
        "dados": linha["dados"]
    })


# =========================
# INICIAR SERVIDOR
# =========================

if __name__ == "__main__":

    iniciar_banco()

    print("🐸 BLDM Eventos iniciado!")
    print("🌐 http://localhost:8000")

    app.run(
        host="0.0.0.0",
        port=8000,
        debug=False
    )

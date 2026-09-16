from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os

app = Flask(__name__)

app.secret_key = os.environ.get(
    "BLDM_SECRET_KEY",
    "bldm-chave-temporaria-trocar-depois"
)

DATABASE = "bldm.db"


def conectar():
    conexao = sqlite3.connect(DATABASE)
    conexao.row_factory = sqlite3.Row
    return conexao


def iniciar_banco():
    conexao = conectar()

    conexao.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            senha TEXT NOT NULL
        )
    """)

    conexao.execute("""
        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            data TEXT NOT NULL,
            hora TEXT,
            descricao TEXT NOT NULL
        )
    """)

    admin = conexao.execute(
        "SELECT id FROM admins LIMIT 1"
    ).fetchone()

    if admin is None:
        conexao.execute(
            "INSERT INTO admins (nome, senha) VALUES (?, ?)",
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
        VALUES (?, ?, ?, ?)
    """, (
        titulo,
        data,
        hora,
        descricao
    ))

    conexao.commit()

    evento_id = cursor.lastrowid

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
        WHERE id = ?
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
        "DELETE FROM eventos WHERE id = ?",
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

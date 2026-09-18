"""
Agente de status da TV Box — roda direto na tvbox (não no servidor do site).

Coleta CPU/temperatura/RAM/armazenamento/ping/velocidade e serviços do pm2,
e envia (heartbeat) pro BLDM Events a cada X segundos, pra aba "TV Box" do
site mostrar tudo remotamente.

Configuração (variáveis de ambiente):
    TVBOX_SERVER_URL   URL do site, ex: https://bldm-events.onrender.com
    TVBOX_TOKEN        precisa ser IGUAL ao TVBOX_TOKEN configurado no server.py
    TVBOX_INTERVALO    segundos entre cada heartbeat (padrão: 30)

Rodar com pm2 (mesmo padrão usado pro frog bot):
    pm2 start tvbox_agent.py --interpreter python3 --name tvbox-agent
    pm2 save

Dependência: psutil (pip install psutil)
"""

import json
import os
import re
import subprocess
import time
import urllib.request

import psutil


SERVER_URL = os.environ.get(
    "TVBOX_SERVER_URL",
    "http://localhost:8000"
).rstrip("/")

TOKEN = os.environ.get(
    "TVBOX_TOKEN",
    "6oPzCjgW6B8wRqwCDfNrM8-xHXYfqXqNK45Y05RJ5ng"
)

INTERVALO_SEGUNDOS = int(os.environ.get("TVBOX_INTERVALO", "30"))

URL_TESTE_VELOCIDADE = "https://speed.cloudflare.com/__down?bytes=10000000"


def medir_ping(host="8.8.8.8"):

    try:
        resultado = subprocess.run(
            ["ping", "-c", "1", "-W", "2", host],
            capture_output=True,
            text=True,
            timeout=5
        )

        combinado = resultado.stdout + resultado.stderr

        casamento = re.search(r"time[=<]([\d.]+)", combinado)

        if casamento:
            return float(casamento.group(1))

    except Exception:
        pass

    return None


def medir_velocidade_download():

    try:
        inicio = time.time()

        total_bytes = 0

        with urllib.request.urlopen(
            URL_TESTE_VELOCIDADE, timeout=10
        ) as resposta:

            while True:

                pedaco = resposta.read(65536)

                if not pedaco:
                    break

                total_bytes += len(pedaco)

        duracao = time.time() - inicio

        if duracao <= 0:
            return None

        megabits = (total_bytes * 8) / 1_000_000

        return round(megabits / duracao, 2)

    except Exception:
        return None


def medir_temperatura_cpu():

    try:
        sensores = psutil.sensors_temperatures()

        for leituras in sensores.values():

            if leituras:
                return round(leituras[0].current, 1)

    except Exception:
        pass

    caminhos_possiveis = [
        "/sys/class/thermal/thermal_zone0/temp",
        "/sys/class/thermal/thermal_zone1/temp",
    ]

    for caminho in caminhos_possiveis:

        try:
            with open(caminho) as arquivo:
                return round(int(arquivo.read().strip()) / 1000, 1)

        except Exception:
            continue

    return None


def listar_servicos_pm2():

    try:
        resultado = subprocess.run(
            ["pm2", "jlist"],
            capture_output=True,
            text=True,
            timeout=5
        )

        processos = json.loads(resultado.stdout)

        servicos = []

        for processo in processos:

            monit = processo.get("monit", {})

            servicos.append({
                "nome": processo.get("name"),
                "status": processo.get("pm2_env", {}).get("status"),
                "cpu_percent": monit.get("cpu"),
                "memoria_mb": round(
                    monit.get("memory", 0) / (1024 * 1024), 1
                )
            })

        return servicos

    except Exception:
        return []


def coletar_status():

    ram = psutil.virtual_memory()
    disco = psutil.disk_usage("/")

    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "cpu_temp_c": medir_temperatura_cpu(),

        "ram_total_mb": round(ram.total / (1024 * 1024), 1),
        "ram_disponivel_mb": round(ram.available / (1024 * 1024), 1),
        "ram_percentual": ram.percent,

        "disco_total_gb": round(disco.total / (1024 ** 3), 1),
        "disco_livre_gb": round(disco.free / (1024 ** 3), 1),
        "disco_percentual": disco.percent,

        "ping_ms": medir_ping(),
        "download_mbps": medir_velocidade_download(),

        "servicos": listar_servicos_pm2()
    }


def enviar_heartbeat(dados):

    corpo = json.dumps(dados).encode("utf-8")

    requisicao = urllib.request.Request(
        f"{SERVER_URL}/api/tvbox/heartbeat",
        data=corpo,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-TVBOX-TOKEN": TOKEN
        }
    )

    with urllib.request.urlopen(requisicao, timeout=15) as resposta:
        return resposta.status


if __name__ == "__main__":

    print("📡 Agente da TV Box iniciado!")
    print(f"🌐 Enviando pra {SERVER_URL} a cada {INTERVALO_SEGUNDOS}s")

    while True:

        try:
            status = coletar_status()

            enviar_heartbeat(status)

            print(f"✅ Heartbeat enviado: {status}")

        except Exception as erro:
            print(f"❌ Falha ao enviar heartbeat: {erro}")

        time.sleep(INTERVALO_SEGUNDOS)

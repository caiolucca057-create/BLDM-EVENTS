async function mostrarAba(aba) {
    const calendario = document.getElementById("calendario");
    const eventos = document.getElementById("eventos");
    const tvbox = document.getElementById("tvbox");
    const botoes = document.querySelectorAll(".aba");

    calendario.style.display = aba === "calendario" ? "block" : "none";
    eventos.style.display = aba === "eventos" ? "block" : "none";
    tvbox.style.display = aba === "tvbox" ? "block" : "none";

    if (aba === "eventos") {
        await verificarAdm();
        await mostrarEventos();
    }

    if (aba === "tvbox") {
        await mostrarStatusTvbox();
    }

    botoes.forEach(function(botao) {
        botao.classList.remove("ativa");
    });

    if (aba === "calendario") {
        botoes[0].classList.add("ativa");
    } else if (aba === "eventos") {
        botoes[1].classList.add("ativa");
    } else {
        botoes[2].classList.add("ativa");
    }
}


/* =========================
   DATAS ESPECIAIS
========================= */

const datasEspeciais = [
    { data: "02/01", nome: "Dia do Sanitarista", tipo: "comemorativa" },
    { data: "06/01", nome: "Dia de Reis", tipo: "comemorativa" },
    { data: "09/01", nome: "Dia do Astronauta", tipo: "comemorativa" },
    { data: "20/01", nome: "Dia do Farmacêutico", tipo: "comemorativa" },

    { data: "16/02", nome: "Carnaval", tipo: "ponto facultativo" },
    { data: "17/02", nome: "Carnaval", tipo: "ponto facultativo" },

    { data: "08/03", nome: "Dia Internacional da Mulher", tipo: "comemorativa" },
    { data: "15/03", nome: "Dia do Consumidor", tipo: "comemorativa" },
    { data: "20/03", nome: "Dia Mundial da Saúde Bucal", tipo: "comemorativa" },

    { data: "01/04", nome: "Dia da Mentira", tipo: "comemorativa" },
    { data: "05/04", nome: "Páscoa", tipo: "comemorativa" },
    { data: "21/04", nome: "Tiradentes", tipo: "feriado" },
    { data: "22/04", nome: "Descobrimento do Brasil", tipo: "comemorativa" },
    { data: "23/04", nome: "Dia Mundial do Livro", tipo: "comemorativa" },

    { data: "01/05", nome: "Dia do Trabalho", tipo: "feriado" },
    { data: "10/05", nome: "Dia das Mães", tipo: "comemorativa" },
    { data: "15/05", nome: "Dia Internacional da Família", tipo: "comemorativa" },
    { data: "17/05", nome: "Dia Mundial da Internet", tipo: "comemorativa" },

    { data: "05/06", nome: "Dia Mundial do Meio Ambiente", tipo: "comemorativa" },
    { data: "13/06", nome: "Santo Antônio", tipo: "comemorativa" },
    { data: "24/06", nome: "São João", tipo: "comemorativa" },

    { data: "10/07", nome: "Dia da Pizza", tipo: "comemorativa" },
    { data: "20/07", nome: "Dia do Amigo", tipo: "comemorativa" },
    { data: "26/07", nome: "Dia dos Avós", tipo: "comemorativa" },

    { data: "09/08", nome: "Dia dos Pais", tipo: "comemorativa" },
    { data: "11/08", nome: "Dia do Estudante", tipo: "comemorativa" },
    { data: "22/08", nome: "Dia do Folclore", tipo: "comemorativa" },

    { data: "07/09", nome: "Independência do Brasil", tipo: "feriado" },
    { data: "15/09", nome: "Dia do Cliente", tipo: "comemorativa" },
    { data: "21/09", nome: "Dia da Árvore", tipo: "comemorativa" },

    { data: "04/10", nome: "Dia Mundial dos Animais", tipo: "comemorativa" },
    { data: "12/10", nome: "Dia das Crianças", tipo: "comemorativa" },
    { data: "31/10", nome: "Halloween", tipo: "comemorativa" },

    { data: "02/11", nome: "Finados", tipo: "feriado" },
    { data: "15/11", nome: "Proclamação da República", tipo: "feriado" },
    { data: "20/11", nome: "Dia da Consciência Negra", tipo: "feriado" },

    { data: "24/12", nome: "Véspera de Natal", tipo: "comemorativa" },
    { data: "25/12", nome: "Natal", tipo: "feriado" },
    { data: "31/12", nome: "Véspera de Ano-Novo", tipo: "comemorativa" }
];

const meses = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO"
];

function mostrarDatas() {
    const container = document.getElementById("datas-especiais");

    if (!container) return;

    container.innerHTML = "";

    meses.forEach(function(mes, indice) {

        const numeroMes = String(indice + 1).padStart(2, "0");

        const eventosDoMes = datasEspeciais.filter(function(evento) {
            return evento.data.endsWith("/" + numeroMes);
        });

        if (eventosDoMes.length === 0) return;

        const bloco = document.createElement("div");
        bloco.className = "mes";

        const titulo = document.createElement("h3");
        titulo.textContent = mes;

        bloco.appendChild(titulo);

        eventosDoMes.forEach(function(evento) {

            const div = document.createElement("div");
            div.className = "data-item";

            const data = document.createElement("strong");
            data.textContent = evento.data;

            const nome = document.createElement("span");
            nome.textContent = evento.nome;

            const tipo = document.createElement("small");

            if (evento.tipo === "feriado") {
                tipo.textContent = "🇧🇷 Feriado";
            } else if (evento.tipo === "ponto facultativo") {
                tipo.textContent = "📌 Ponto facultativo";
            } else {
                tipo.textContent = "🎉 Data comemorativa";
            }

            div.appendChild(data);
            div.appendChild(nome);
            div.appendChild(tipo);

            bloco.appendChild(div);
        });

        container.appendChild(bloco);
    });
}


/* =========================
   API
========================= */

async function buscarEventos() {

    try {

        const resposta = await fetch("/api/eventos");

        if (!resposta.ok) {
            throw new Error("Erro ao buscar eventos.");
        }

        return await resposta.json();

    } catch (erro) {

        console.error(erro);

        return [];
    }
}


async function mostrarEventos() {

    const lista = document.getElementById("lista-eventos");

    if (!lista) return;

    const campoPesquisa =
        document.getElementById("pesquisa-eventos");

    const pesquisa =
        campoPesquisa
            ? campoPesquisa.value.toLowerCase().trim()
            : "";

    let eventos = await buscarEventos();

    eventos = eventos.filter(function(evento) {

        return (
            evento.titulo.toLowerCase().includes(pesquisa) ||
            evento.descricao.toLowerCase().includes(pesquisa)
        );

    });

    lista.innerHTML = "";

    if (eventos.length === 0) {

        lista.innerHTML = `
            <div class="evento-futuro">
                <h3>🐸 Nenhum evento encontrado</h3>
                <p>
                    Ainda não existem eventos futuros cadastrados.
                </p>
            </div>
        `;

        await atualizarProximoEvento();

        return;
    }


    const status = await fetch("/api/status");
    const dadosStatus = await status.json();

    eventos.forEach(function(evento) {

        const div = document.createElement("div");

        div.className = "evento-futuro";

        div.innerHTML = `
            <h3>🎪 ${escaparHTML(evento.titulo)}</h3>

            <p>
                📅 ${formatarData(evento.data)}
                ${evento.hora ? " • ⏰ " + evento.hora : ""}
            </p>

            <p>
                ${escaparHTML(evento.descricao)}
            </p>

            ${
                dadosStatus.logado
                ?
                `
                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:15px;
                    flex-wrap:wrap;
                ">

                    <button
                        class="botao-adm"
                        onclick="editarEvento(${evento.id})"
                    >
                        ✏️ Editar
                    </button>

                    <button
                        class="botao-adm"
                        onclick="excluirEvento(${evento.id})"
                    >
                        🗑️ Excluir
                    </button>

                </div>
                `
                :
                ""
            }
        `;

        lista.appendChild(div);
    });

    await atualizarProximoEvento();
}


function formatarData(data) {

    if (!data) return "";

    const partes = data.split("-");

    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


function escaparHTML(texto) {

    const div = document.createElement("div");

    div.textContent = texto || "";

    return div.innerHTML;
}


/* =========================
   PRÓXIMO EVENTO
========================= */

async function atualizarProximoEvento() {

    const container =
        document.getElementById("proximo-evento");

    if (!container) return;

    const eventos = await buscarEventos();

    const agora = new Date();

    const futuros = eventos
        .filter(function(evento) {

            return new Date(
                `${evento.data}T${evento.hora || "00:00"}`
            ) >= agora;

        })
        .sort(function(a, b) {

            return new Date(
                `${a.data}T${a.hora || "00:00"}`
            ) - new Date(
                `${b.data}T${b.hora || "00:00"}`
            );

        });


    if (futuros.length === 0) {

        container.innerHTML = `
            <h3>🐸 Nenhum evento futuro</h3>

            <p>
                Os próximos eventos do BLDM aparecerão aqui.
            </p>
        `;

        return;
    }


    const evento = futuros[0];

    container.innerHTML = `
        <h3>🎪 ${escaparHTML(evento.titulo)}</h3>

        <p>
            📅 ${formatarData(evento.data)}
            ${evento.hora ? " • ⏰ " + evento.hora : ""}
        </p>

        <p>
            ${escaparHTML(evento.descricao)}
        </p>
    `;
}


/* =========================
   LOGIN
========================= */

async function entrarAdm() {

    const senha =
        document.getElementById("senha-adm").value;

    const mensagem =
        document.getElementById("mensagem-login");

    if (!senha) {

        mensagem.textContent =
            "❌ Digite a senha.";

        return;
    }


    try {

        const resposta = await fetch("/api/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                senha: senha
            })

        });


        const dados = await resposta.json();


        if (!resposta.ok) {

            mensagem.textContent =
                "❌ " + dados.mensagem;

            return;
        }


        mensagem.textContent =
            "✅ Login realizado!";

        document.getElementById("senha-adm").value = "";

        document.getElementById("login-adm").style.display =
            "none";

        document.getElementById("painel-adm").style.display =
            "block";

        await mostrarEventos();

    } catch (erro) {

        mensagem.textContent =
            "❌ Não foi possível conectar ao servidor.";

        console.error(erro);
    }
}


async function verificarAdm() {

    try {

        const resposta =
            await fetch("/api/status");

        const dados =
            await resposta.json();

        if (dados.logado) {

            document.getElementById("login-adm").style.display =
                "none";

            document.getElementById("painel-adm").style.display =
                "block";

        } else {

            document.getElementById("login-adm").style.display =
                "block";

            document.getElementById("painel-adm").style.display =
                "none";
        }

    } catch (erro) {

        console.error(erro);
    }
}


async function sairAdm() {

    await fetch("/api/logout", {
        method: "POST"
    });

    await verificarAdm();

    await mostrarEventos();
}


/* =========================
   CRIAR
========================= */

async function salvarEvento() {

    const titulo =
        document.getElementById("evento-titulo").value.trim();

    const data =
        document.getElementById("evento-data").value;

    const hora =
        document.getElementById("evento-hora").value;

    const descricao =
        document.getElementById("evento-descricao").value.trim();


    if (!titulo || !data || !descricao) {

        alert("Preencha nome, data e descrição.");

        return;
    }


    try {

        const resposta = await fetch("/api/eventos", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                titulo: titulo,
                data: data,
                hora: hora,
                descricao: descricao
            })

        });


        const dados = await resposta.json();


        if (!resposta.ok) {

            alert("❌ " + (dados.erro || "Erro ao criar evento."));

            return;
        }


        document.getElementById("evento-titulo").value = "";
        document.getElementById("evento-data").value = "";
        document.getElementById("evento-hora").value = "";
        document.getElementById("evento-descricao").value = "";


        await mostrarEventos();

        alert("✅ Evento criado com sucesso!");

    } catch (erro) {

        console.error(erro);

        alert("❌ Erro de conexão com o servidor.");
    }
}


/* =========================
   EDITAR
========================= */

async function editarEvento(id) {

    const eventos = await buscarEventos();

    const evento = eventos.find(function(item) {
        return item.id === id;
    });

    if (!evento) return;


    const titulo = prompt(
        "Nome do evento:",
        evento.titulo
    );

    if (titulo === null) return;


    const data = prompt(
        "Data (AAAA-MM-DD):",
        evento.data
    );

    if (data === null) return;


    const hora = prompt(
        "Horário:",
        evento.hora || ""
    );

    if (hora === null) return;


    const descricao = prompt(
        "Descrição:",
        evento.descricao
    );

    if (descricao === null) return;


    try {

        const resposta = await fetch(
            `/api/eventos/${id}`,
            {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    titulo: titulo.trim(),
                    data: data.trim(),
                    hora: hora.trim(),
                    descricao: descricao.trim()
                })

            }
        );


        const dados = await resposta.json();


        if (!resposta.ok) {

            alert(
                "❌ " +
                (dados.erro || "Erro ao editar evento.")
            );

            return;
        }


        await mostrarEventos();

        alert("✅ Evento atualizado!");

    } catch (erro) {

        console.error(erro);

        alert("❌ Erro de conexão.");
    }
}


/* =========================
   EXCLUIR
========================= */

async function excluirEvento(id) {

    const confirmar = confirm(
        "Tem certeza que deseja excluir este evento?"
    );

    if (!confirmar) return;


    try {

        const resposta = await fetch(
            `/api/eventos/${id}`,
            {
                method: "DELETE"
            }
        );


        const dados = await resposta.json();


        if (!resposta.ok) {

            alert(
                "❌ " +
                (dados.erro || "Erro ao excluir.")
            );

            return;
        }


        await mostrarEventos();

        alert("🗑️ Evento excluído!");

    } catch (erro) {

        console.error(erro);

        alert("❌ Erro de conexão.");
    }
}


/* =========================
   TVBOX
========================= */

function formatarTempoDesde(segundos) {

    if (segundos == null) return "nunca";

    if (segundos < 60) {
        return `${Math.floor(segundos)}s atrás`;
    }

    if (segundos < 3600) {
        return `${Math.floor(segundos / 60)}min atrás`;
    }

    return `${Math.floor(segundos / 3600)}h atrás`;
}


function criarBarra(percentual, cor) {

    const valor = percentual == null ? 0 : Math.min(100, percentual);

    return `
        <div class="tvbox-barra-fundo">
            <div
                class="tvbox-barra-preenchida"
                style="width:${valor}%; background:${cor};"
            ></div>
        </div>
    `;
}


async function buscarStatusTvbox() {

    try {

        const resposta = await fetch("/api/tvbox/status");

        if (!resposta.ok) {
            throw new Error("Erro ao buscar status da tvbox.");
        }

        return await resposta.json();

    } catch (erro) {

        console.error(erro);

        return null;
    }
}


async function mostrarStatusTvbox() {

    const container = document.getElementById("tvbox-status");

    if (!container) return;

    const status = await buscarStatusTvbox();

    if (!status || !status.dados) {

        container.innerHTML = `
            <p>
                🐸 Nenhum sinal da TV Box ainda. Verifique se o
                <code>tvbox_agent.py</code> está rodando.
            </p>
        `;

        return;
    }

    const dados = status.dados;

    const badge = status.online
        ? `<span class="tvbox-badge tvbox-online">🟢 Online</span>`
        : `<span class="tvbox-badge tvbox-offline">🔴 Offline</span>`;

    const servicosHTML = (dados.servicos || []).length
        ? dados.servicos.map(function(servico) {

            const statusOk = servico.status === "online";

            return `
                <div class="tvbox-servico">
                    <span>${statusOk ? "🟢" : "🔴"} ${escaparHTML(servico.nome || "?")}</span>
                    <small>
                        CPU ${servico.cpu_percent ?? "?"}%
                        • RAM ${servico.memoria_mb ?? "?"}MB
                    </small>
                </div>
            `;

        }).join("")
        : `<p>Nenhum serviço reportado.</p>`;

    container.innerHTML = `
        <div class="tvbox-cabecalho">
            ${badge}
            <span class="tvbox-visto">
                Última atualização: ${formatarTempoDesde(status.segundos_desde_ultimo_ping)}
            </span>
        </div>

        <div class="tvbox-grid">

            <div class="tvbox-metrica">
                <strong>📶 Ping</strong>
                <span>${dados.ping_ms != null ? dados.ping_ms + " ms" : "—"}</span>
            </div>

            <div class="tvbox-metrica">
                <strong>⚡ Velocidade</strong>
                <span>${dados.download_mbps != null ? dados.download_mbps + " Mbps" : "—"}</span>
            </div>

            <div class="tvbox-metrica">
                <strong>🌡️ Temperatura</strong>
                <span>${dados.cpu_temp_c != null ? dados.cpu_temp_c + " °C" : "—"}</span>
            </div>

            <div class="tvbox-metrica">
                <strong>🧠 CPU</strong>
                <span>${dados.cpu_percent != null ? dados.cpu_percent + "%" : "—"}</span>
                ${criarBarra(dados.cpu_percent, "#7c7cf5")}
            </div>

            <div class="tvbox-metrica">
                <strong>💾 RAM</strong>
                <span>
                    ${dados.ram_disponivel_mb != null ? dados.ram_disponivel_mb + "MB livres de " + dados.ram_total_mb + "MB" : "—"}
                </span>
                ${criarBarra(dados.ram_percentual, "#f5a623")}
            </div>

            <div class="tvbox-metrica">
                <strong>📦 Armazenamento</strong>
                <span>
                    ${dados.disco_livre_gb != null ? dados.disco_livre_gb + "GB livres de " + dados.disco_total_gb + "GB" : "—"}
                </span>
                ${criarBarra(dados.disco_percentual, "#4cd964")}
            </div>

        </div>

        <h3 class="tvbox-subtitulo">⚙️ Serviços</h3>

        <div class="tvbox-servicos">
            ${servicosHTML}
        </div>
    `;
}


setInterval(function() {

    const aba = document.getElementById("tvbox");

    if (aba && aba.style.display !== "none") {
        mostrarStatusTvbox();
    }

}, 20000);


/* =========================
   INICIALIZAÇÃO
========================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        mostrarDatas();

        await verificarAdm();

        await mostrarEventos();

        await atualizarProximoEvento();

        console.log("🐸 BLDM Eventos conectado ao servidor!");
    }
);

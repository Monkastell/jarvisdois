from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import json
import os
import uuid
from datetime import datetime
import threading
from ipaddress import IPv4Address

from pyairmore.request import AirmoreSession
from pyairmore.services.messaging import MessagingService

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

ARQUIVO_TEMPLATES = "templates_sms.json"
ARQUIVO_RELATORIOS = "relatorios_sms.json"
ARQUIVO_HISTORICO = "historico_disparos.json"


class AirMoreSMS:
    def __init__(self):
        self.session = None
        self.service = None
        self.ip = None
        self.porta = None
        self.authorized = False
        self.authorization_requested = False
        self.last_error = None
        self.last_connected_at = None
        self.pending_authorization = False

    def conectado(self) -> bool:
        return self.service is not None and self.authorized is True

    def reset(self):
        self.session = None
        self.service = None
        self.authorized = False
        self.authorization_requested = False
        self.last_error = None
        self.pending_authorization = False

    def iniciar_conexao(self, ip: str, porta: int = 2333):
        self.reset()
        self.ip = ip
        self.porta = int(porta)

        try:
            ip_addr = IPv4Address(ip)
        except Exception as exc:
            self.last_error = f"IP inválido: {exc}"
            raise RuntimeError(self.last_error)

        try:
            self.session = AirmoreSession(ip_addr, self.porta)

            if not self.session.is_server_running:
                self.last_error = (
                    "Servidor AirMore não está rodando ou o IP/porta estão incorretos."
                )
                raise RuntimeError(self.last_error)

            self.authorization_requested = True
            self.pending_authorization = True

            try:
                # Aqui só disparamos o pedido no celular.
                # NÃO marcamos conectado ainda.
                self.session.request_authorization()
            except Exception as exc:
                self.last_error = f"Falha ao solicitar autorização: {exc}"
                raise RuntimeError(self.last_error)

            self.last_error = None
            return True

        except Exception as exc:
            if not self.last_error:
                self.last_error = str(exc)
            raise RuntimeError(self.last_error)

    def atualizar_autorizacao(self):
        """
        Revalida o estado da autorização.
        Esse método é chamado no /status para descobrir se o usuário já aceitou no celular.
        """
        if not self.session:
            return

        if self.authorized and self.service:
            return

        if not self.authorization_requested:
            return

        try:
            authorized = bool(self.session.request_authorization())

            if authorized:
                self.authorized = True
                self.pending_authorization = False
                if not self.service:
                    self.service = MessagingService(self.session)
                self.last_connected_at = int(time.time())
                self.last_error = None
            else:
                self.authorized = False
                self.pending_authorization = True

        except Exception as exc:
            self.authorized = False
            self.pending_authorization = True
            self.last_error = str(exc)

    def desconectar(self):
        self.reset()
        self.ip = None
        self.porta = None
        self.last_connected_at = None
        return True

    def status(self):
        self.atualizar_autorizacao()
        return {
            "success": True,
            "connected": self.conectado(),
            "authorized": self.authorized,
            "authorization_requested": self.authorization_requested,
            "pending_authorization": self.pending_authorization,
            "ip": self.ip,
            "porta": self.porta,
            "last_error": self.last_error,
            "last_connected_at": self.last_connected_at,
        }

    def enviar(self, telefone: str, mensagem: str):
        self.atualizar_autorizacao()

        if not self.service or not self.authorized:
            raise RuntimeError(
                "AirMore não conectado/autorizado. Conecte novamente e aceite no celular."
            )

        self.service.send_message(telefone, mensagem)
        return {
            "success": True,
            "phone": telefone,
            "message": mensagem,
        }


sms_service = AirMoreSMS()


def carregar_json(arquivo, padrao):
    if os.path.exists(arquivo):
        try:
            with open(arquivo, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return padrao
    return padrao


def salvar_json(arquivo, dados):
    with open(arquivo, "w", encoding="utf-8") as f:
        json.dump(dados, f, indent=2, ensure_ascii=False)


@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "servidor": "online",
        **sms_service.status(),
    })


@app.route("/connect", methods=["POST"])
def connect():
    data = request.get_json() or {}
    ip = str(data.get("ip", "")).strip()
    porta = int(data.get("porta", 2333))

    if not ip:
        return jsonify({"success": False, "error": "IP não informado"}), 400

    try:
        sms_service.iniciar_conexao(ip, porta)

        return jsonify({
            "success": True,
            "connected": False,
            "authorized": False,
            "pending_authorization": True,
            "authorization_requested": True,
            "ip": ip,
            "porta": porta,
            "message": "Pedido de autorização enviado. Aceite no celular para concluir.",
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            **sms_service.status(),
        }), 500


@app.route("/disconnect", methods=["POST"])
def disconnect():
    sms_service.desconectar()
    return jsonify({"success": True, "message": "AirMore desconectado", **sms_service.status()})


@app.route("/templates", methods=["GET"])
def listar_templates():
    templates = carregar_json(ARQUIVO_TEMPLATES, [])
    return jsonify(templates)


@app.route("/templates", methods=["POST"])
def criar_template():
    data = request.get_json() or {}
    nome = data.get("nome")
    conteudo = data.get("conteudo")

    if not nome or not conteudo:
        return jsonify({"success": False, "error": "Nome e conteúdo obrigatórios"}), 400

    templates = carregar_json(ARQUIVO_TEMPLATES, [])
    novo_template = {
        "id": str(uuid.uuid4())[:8],
        "nome": nome,
        "conteudo": conteudo,
        "criado": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "usos": 0,
    }
    templates.append(novo_template)
    salvar_json(ARQUIVO_TEMPLATES, templates)
    return jsonify({"success": True, "template": novo_template})


@app.route("/templates/<template_id>", methods=["PUT", "DELETE"])
def editar_ou_excluir_template(template_id):
    templates = carregar_json(ARQUIVO_TEMPLATES, [])
    template = next((t for t in templates if t["id"] == template_id), None)

    if not template:
        return jsonify({"success": False, "error": "Template não encontrado"}), 404

    if request.method == "DELETE":
        templates = [t for t in templates if t["id"] != template_id]
        salvar_json(ARQUIVO_TEMPLATES, templates)
        return jsonify({"success": True})

    data = request.get_json() or {}
    template["nome"] = data.get("nome", template["nome"])
    template["conteudo"] = data.get("conteudo", template["conteudo"])
    salvar_json(ARQUIVO_TEMPLATES, templates)
    return jsonify({"success": True, "template": template})


@app.route("/send_batch", methods=["POST"])
def send_batch():
    if not sms_service.conectado():
        return jsonify({"success": False, "error": "AirMore não conectado/autorizado"}), 400

    data = request.get_json() or {}
    mensagem_base = data.get("mensagem")
    lista_envio = data.get("lista", [])
    delay = max(1, int(data.get("delay", 5)))

    if not mensagem_base or not lista_envio:
        return jsonify({"success": False, "error": "Mensagem ou lista ausente"}), 400

    def enviar():
        historico = carregar_json(ARQUIVO_HISTORICO, [])
        relatorios = carregar_json(ARQUIVO_RELATORIOS, {})
        data_hoje = datetime.now().strftime("%Y-%m-%d")

        if data_hoje not in relatorios:
            relatorios[data_hoje] = {
                "total_enviados": 0,
                "sucessos": 0,
                "erros": 0,
                "respondidos": 0,
            }

        for index, item in enumerate(lista_envio):
            tel_original = str(item.get("telefone", "")).strip()
            mensagem = mensagem_base

            for chave, valor in (item.get("vars", {}) or {}).items():
                mensagem = mensagem.replace(f"{{{chave}}}", str(valor))

            try:
                sms_service.enviar(tel_original, mensagem)
                status_envio = "SUCESSO"
            except Exception as e:
                status_envio = f"ERRO: {str(e)}"

            historico.append({
                "data": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "indice": index + 1,
                "total_lista": len(lista_envio),
                "telefone": tel_original,
                "status": status_envio,
                "mensagem": mensagem,
                "delay": delay,
            })

            relatorios[data_hoje]["total_enviados"] += 1
            if status_envio == "SUCESSO":
                relatorios[data_hoje]["sucessos"] += 1
            else:
                relatorios[data_hoje]["erros"] += 1

            salvar_json(ARQUIVO_HISTORICO, historico)
            salvar_json(ARQUIVO_RELATORIOS, relatorios)

            if index < len(lista_envio) - 1:
                time.sleep(delay)

    threading.Thread(target=enviar, daemon=True).start()

    return jsonify({
        "success": True,
        "message": "Disparo iniciado",
        "delay": delay,
        "total": len(lista_envio),
    })


@app.route("/reports", methods=["GET"])
def reports():
    return jsonify(carregar_json(ARQUIVO_RELATORIOS, {}))


@app.route("/history", methods=["GET"])
def history():
    return jsonify(carregar_json(ARQUIVO_HISTORICO, []))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
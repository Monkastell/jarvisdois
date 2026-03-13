import time
from ipaddress import IPv4Address

from pyairmore.request import AirmoreSession
from pyairmore.services.messaging import MessagingService


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

    def conectado(self) -> bool:
        return self.service is not None and self.authorized is True

    def _reset_runtime(self):
        self.session = None
        self.service = None
        self.authorized = False
        self.authorization_requested = False
        self.last_error = None

    def conectar(self, ip: str, porta: int = 2333):
        self._reset_runtime()

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

            authorized = False

            # Aumentado para dar tempo real de o usuário aceitar no celular
            # sem a requisição morrer cedo demais.
            max_attempts = 15
            sleep_seconds = 2

            for _ in range(max_attempts):
                try:
                    authorized = bool(self.session.request_authorization())
                except Exception:
                    authorized = False

                if authorized:
                    break

                time.sleep(sleep_seconds)

            if not authorized:
                self.last_error = (
                    "O pedido de autorização foi enviado, mas não foi confirmado no celular. "
                    "Abra o app AirMore no telefone, deixe-o visível e aceite a conexão."
                )
                raise RuntimeError(self.last_error)

            self.authorized = True
            self.service = MessagingService(self.session)
            self.last_connected_at = int(time.time())
            self.last_error = None
            return True

        except Exception as exc:
            if not self.last_error:
                self.last_error = str(exc)
            self.service = None
            self.authorized = False
            raise RuntimeError(self.last_error)

    def desconectar(self):
        self._reset_runtime()
        self.ip = None
        self.porta = None
        self.last_connected_at = None
        return True

    def status(self):
        return {
            "connected": self.conectado(),
            "authorized": self.authorized,
            "authorization_requested": self.authorization_requested,
            "ip": self.ip,
            "porta": self.porta,
            "last_error": self.last_error,
            "last_connected_at": self.last_connected_at,
        }

    def enviar(self, telefone: str, mensagem: str):
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


airmore = AirMoreSMS()


def connect_airmore(ip: str, porta: int = 2333):
    airmore.conectar(ip, porta)
    return airmore.status()


def disconnect_airmore():
    airmore.desconectar()
    return airmore.status()


def get_airmore_status():
    return airmore.status()


def send_sms(phone: str, message: str):
    return airmore.enviar(phone, message)
# Bridge local AirMore

O frontend NÃO deve conversar direto com o AirMore como regra principal.

## Fluxo correto
React -> Bridge Local -> AirMore local

## Endpoints esperados no bridge
POST /api/airmore/ping
Body:
{
  "host": "192.168.0.8",
  "port": "2333"
}

POST /api/airmore/send
Body:
{
  "host": "192.168.0.8",
  "port": "2333",
  "phone": "5582999999999",
  "message": "Mensagem SMS",
  "listName": "Lista XPTO",
  "priority": 1
}

## Observação
Hoje o módulo está preparado para essa ponte local.
Depois podemos migrar a mesma lógica para:
- serviço windows
- backend node/python
- app desktop
- microserviço dockerizado
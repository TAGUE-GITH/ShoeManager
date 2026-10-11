"""US-18 : recu de caisse au format PDF (ticket etroit, imprimable sur une imprimante de caisse 80 mm)."""

from io import BytesIO

from django.utils import timezone
from reportlab.lib.pagesizes import mm
from reportlab.pdfgen import canvas

WIDTH = 80 * mm

PAYMENTS = {'ESPECES': 'Espèces', 'MOBILE_MONEY': 'Mobile Money', 'CARTE': 'Carte bancaire'}


def money(amount):
    """110000 -> '110 000 FCFA' (espaces simples : lisibles par toutes les imprimantes)."""
    return f'{int(amount):,} FCFA'.replace(',', ' ')


def build_receipt(sale):
    items = list(sale.items.all())
    # Hauteur ajustee au contenu (ticket de caisse continu)
    optional_rows = bool(sale.customer) + bool(sale.reservation)
    height = (72 + 9 * len(items) + 5 * optional_rows) * mm
    buffer = BytesIO()
    # Sans compression : le texte reste lisible dans le fichier (et verifiable par les tests)
    pdf = canvas.Canvas(buffer, pagesize=(WIDTH, height), pageCompression=0)
    pdf.setTitle(f'Reçu {sale.reference}')
    y = height - 12 * mm

    def line(text, size=8, bold=False, align='left', gap=4.5):
        nonlocal y
        pdf.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
        if align == 'center':
            pdf.drawCentredString(WIDTH / 2, y, text)
        else:
            pdf.drawString(5 * mm, y, text)
        y -= gap * mm

    def row(left, right, bold=False):
        nonlocal y
        pdf.setFont('Helvetica-Bold' if bold else 'Helvetica', 8)
        pdf.drawString(5 * mm, y, left)
        pdf.drawRightString(WIDTH - 5 * mm, y, right)
        y -= 4.5 * mm

    def separator():
        nonlocal y
        pdf.setDash(1, 2)
        pdf.line(5 * mm, y + 2 * mm, WIDTH - 5 * mm, y + 2 * mm)
        pdf.setDash()
        y -= 2 * mm

    line('FranckShoese', size=13, bold=True, align='center', gap=5.5)
    line('Akwa, Douala - Cameroun', align='center')
    line('Lundi - samedi, 9 h - 19 h', align='center', gap=7)
    row('Reçu', sale.reference, bold=True)
    row('Date', timezone.localtime(sale.created_at).strftime('%d/%m/%Y %H:%M'))
    row('Vendeur', sale.seller.get_full_name())
    if sale.customer:
        row('Client', sale.customer.get_full_name())
    if sale.reservation:
        row('Réservation', sale.reservation.reference)
    separator()
    for item in items:
        line(f'{item.product_name}', bold=True, gap=4)
        row(
            f'  Pointure {item.size}, {item.color} - {item.quantity} x {money(item.unit_price)}', money(item.line_total)
        )
    separator()
    pdf.setFont('Helvetica-Bold', 11)
    pdf.drawString(5 * mm, y, 'TOTAL')
    pdf.drawRightString(WIDTH - 5 * mm, y, money(sale.total))
    y -= 6 * mm
    row('Paiement', PAYMENTS.get(sale.payment_method, sale.payment_method))
    y -= 3 * mm
    line('Merci pour votre achat !', align='center')
    line('Échange possible sous 7 jours avec ce reçu.', size=7, align='center')

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()

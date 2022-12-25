from decimal import Decimal


def money(value):
    return Decimal(f'{float(value):.2f}')
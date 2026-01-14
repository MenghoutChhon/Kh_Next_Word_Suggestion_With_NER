import React from 'react'

interface PaymentMethodsProps {
  onSelect: (method: string) => void
  selected?: string
}

export default function PaymentMethods({ onSelect, selected }: PaymentMethodsProps) {
  const methods = [
    { id: 'KHQR', name: 'KHQR', icon: '📱', fee: 'No fees' },
    { id: 'CARD', name: 'Credit/Debit Card', icon: '💳', fee: '2.9% fee' },
    { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: '🏦', fee: 'No fees' }
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Payment Method</h3>
      <div className="grid gap-3">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            data-selected={selected === method.id}
            className={`flex items-center justify-between p-4 border rounded-lg hover:bg-card selectable-card ${
              selected === method.id ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{method.icon}</span>
              <div className="text-left">
                <div className="font-medium">{method.name}</div>
                <div className="text-sm text-muted-foreground">{method.fee}</div>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 ${
              selected === method.id ? 'bg-primary border-primary' : 'border-border'
            }`} />
          </button>
        ))}
      </div>
    </div>
  )
}

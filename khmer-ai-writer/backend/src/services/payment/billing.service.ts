// Mock billing service

export const charge = async (userId: string, amount: number, currency = 'USD') => {
  // TODO: integrate with stripe or other gateway
  console.log('Mock billing charge:', { userId, amount, currency });
  const billing = {
    id: `billing-${Date.now()}`,
    userId,
    amount,
    currency,
    status: 'charged',
    createdAt: new Date()
  };
  return billing;
};

export default { charge };
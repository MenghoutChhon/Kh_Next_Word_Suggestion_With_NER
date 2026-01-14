'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  CreditCard, 
  Smartphone, 
  Calendar, 
  DollarSign, 
  Shield, 
  Check,
  ArrowLeft,
  QrCode,
  Building2,
  Crown,
  Tag
} from 'lucide-react';

interface PaymentCheckoutProps {
  selectedPlan: {
    id: string;
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    features: string[];
    billingCycle?: 'monthly' | 'annual';
  };
  onBack: () => void;
  onSuccess: (paymentData: any) => void;
}

export function PaymentCheckout({ selectedPlan, onBack, onSuccess }: PaymentCheckoutProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(selectedPlan.billingCycle || 'monthly');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'khqr' | 'bank'>('khqr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null);
  const [couponError, setCouponError] = useState('');

  const currentPrice = billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice;
  const savings = billingCycle === 'annual' 
    ? Math.round(((selectedPlan.monthlyPrice * 12 - selectedPlan.annualPrice) / (selectedPlan.monthlyPrice * 12)) * 100) 
    : 0;

  // Demo coupon codes
  const validCoupons = {
    'DEMO100': 100,  // 100% off for demo
    'WELCOME50': 50, // 50% off
    'SAVE20': 20     // 20% off
  };

  const handleApplyCoupon = () => {
    setCouponError('');
    const upperCode = couponCode.toUpperCase().trim();
    
    if (validCoupons[upperCode as keyof typeof validCoupons]) {
      const discount = validCoupons[upperCode as keyof typeof validCoupons];
      setAppliedCoupon({ code: upperCode, discount });
      setCouponCode('');
    } else {
      setCouponError('Invalid coupon code');
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const discountAmount = appliedCoupon ? (currentPrice * appliedCoupon.discount / 100) : 0;
  const finalPrice = Math.max(0, currentPrice - discountAmount);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // If 100% discount, skip payment
    if (appliedCoupon?.discount === 100) {
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess({
          method: 'COUPON',
          amount: 0,
          originalAmount: currentPrice,
          coupon: appliedCoupon.code,
          discount: appliedCoupon.discount,
          cycle: billingCycle,
          transactionId: `COUPON_${Date.now()}`
        });
      }, 1000);
      return;
    }
    
    if (paymentMethod === 'khqr') {
      setShowQR(true);
      // Simulate KHQR payment flow
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess({
          method: 'KHQR',
          amount: finalPrice,
          originalAmount: currentPrice,
          coupon: appliedCoupon?.code,
          discount: appliedCoupon?.discount,
          cycle: billingCycle,
          transactionId: `KHQR_${Date.now()}`
        });
      }, 3000);
    } else {
      // Simulate other payment methods
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess({
          method: paymentMethod.toUpperCase(),
          amount: finalPrice,
          originalAmount: currentPrice,
          coupon: appliedCoupon?.code,
          discount: appliedCoupon?.discount,
          cycle: billingCycle,
          transactionId: `${paymentMethod.toUpperCase()}_${Date.now()}`
        });
      }, 2000);
    }
  };

  if (showQR && paymentMethod === 'khqr') {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              KHQR Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="w-64 h-64 bg-white border-2 border-border rounded-lg mx-auto flex items-center justify-center mb-4">
                {/* QR Code Placeholder */}
                <div className="w-48 h-48 bg-black" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='white'/%3E%3Cg fill='black'%3E%3Crect x='0' y='0' width='7' height='7'/%3E%3Crect x='8' y='0' width='7' height='7'/%3E%3Crect x='16' y='0' width='7' height='7'/%3E%3Crect x='0' y='8' width='7' height='7'/%3E%3Crect x='16' y='8' width='7' height='7'/%3E%3Crect x='0' y='16' width='7' height='7'/%3E%3Crect x='8' y='16' width='7' height='7'/%3E%3Crect x='16' y='16' width='7' height='7'/%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: 'cover'
                }}></div>
              </div>
              
              <div className="space-y-2">
                <p className="font-semibold text-lg">${currentPrice} USD</p>
                <p className="text-sm text-muted-foreground">
                  {selectedPlan.name} Plan - {billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
                </p>
                <Badge className="bg-success/15 text-foreground">
                  Scan with any KHQR app
                </Badge>
              </div>
            </div>

            <div className="bg-primary/10 dark:bg-primary/15 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold mb-2 text-foreground dark:text-foreground">ABA Bank Transfer Details:</h4>
              <div className="space-y-2 text-sm">
                <div className="bg-card p-2 rounded">
                  <p className="text-muted-foreground dark:text-muted-foreground">Account Holder:</p>
                  <p className="font-semibold text-foreground dark:text-foreground">CHHON MENGHOUT</p>
                </div>
                <div className="bg-card p-2 rounded">
                  <p className="text-muted-foreground dark:text-muted-foreground">Account Number:</p>
                  <p className="font-semibold text-foreground dark:text-foreground">001 313 802</p>
                </div>
                <div className="pt-2">
                  <a 
                    href="https://pay.ababank.com/oRF8?af_dp=abamobilebank%3A%2F%2F&af_siteid=968860649&pid=af_app_invites&acc=001313802&link_action=abaqr&af_web_dp=https%3A%2F%2Flink.payway.com.kh%2Faba%3Fid%3D1E47E983C4AC%26code%3D780728%26acc%3D001313802%26dynamic%3Dtrue&userid=1E47E983C4AC&&c=abaqr&code=780728&created_from_app=true&af_android_url=https%3A%2F%2Flink.payway.com.kh%2Faba%3Fid%3D1E47E983C4AC%26code%3D780728%26acc%3D001313802%26dynamic%3Dtrue&af_referrer_uid=1726316744902-9536747&af_ios_url=https%3A%2F%2Flink.payway.com.kh%2Faba%3Fid%3D1E47E983C4AC%26code%3D780728%26acc%3D001313802%26dynamic%3Dtrue"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded font-medium text-center w-full"
                  >
                    Open ABA Payment Link
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Waiting for payment...</span>
            </div>

            <Button variant="outline" onClick={() => setShowQR(false)} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payment Options
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Complete Your Subscription</h2>
          <p className="text-muted-foreground text-lg">Secure payment for {selectedPlan.name} plan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                {selectedPlan.id === 'business' ? <Building2 className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">{selectedPlan.name} Plan</span>
                <Badge>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${currentPrice}</span>
                </div>
                {billingCycle === 'annual' && (
                  <div className="flex justify-between text-success">
                    <span>Annual Discount</span>
                    <span>-{savings}%</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-success">
                    <span>Coupon {appliedCoupon.code}</span>
                    <span>-{appliedCoupon.discount}%</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                  <span>Total</span>
                  <span className={appliedCoupon?.discount === 100 ? 'text-success' : ''}>
                    ${finalPrice.toFixed(2)}
                    {appliedCoupon && appliedCoupon.discount === 100 && (
                      <span className="ml-2 text-sm font-normal">(FREE!)</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Included Features:</h4>
                {selectedPlan.features.slice(0, 5).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Form */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-foreground">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Billing Cycle */}
              <div className="space-y-3">
                <Label className="text-foreground">Billing Cycle</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      billingCycle === 'monthly' 
                        ? 'border-primary bg-primary/15' 
                        : 'border-border hover:border-border bg-card'
                    }`}
                  >
                    <div className="font-medium text-foreground">Monthly</div>
                    <div className="text-sm text-muted-foreground">${selectedPlan.monthlyPrice}/month</div>
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`p-4 border rounded-lg text-left transition-colors relative ${
                      billingCycle === 'annual' 
                        ? 'border-primary bg-primary/15' 
                        : 'border-border hover:border-border bg-card'
                    }`}
                  >
                    <div className="font-medium text-foreground">Annual</div>
                    <div className="text-sm text-muted-foreground">${selectedPlan.annualPrice}/year</div>
                    {savings > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-success text-foreground">
                        Save {savings}%
                      </Badge>
                    )}
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="khqr" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    KHQR
                  </TabsTrigger>
                  <TabsTrigger value="card" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Card
                  </TabsTrigger>
                  <TabsTrigger value="bank" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bank
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="khqr" className="space-y-4">
                  <div className="bg-primary/10 dark:bg-primary/15 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground dark:text-foreground">
                      <Smartphone className="h-4 w-4" />
                      KHQR Payment - ABA Bank
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-card p-3 rounded border border-border dark:border-border">
                        <p className="text-muted-foreground dark:text-muted-foreground mb-1">Account Holder:</p>
                        <p className="font-semibold text-foreground dark:text-foreground">CHHON MENGHOUT</p>
                      </div>
                      <div className="bg-card p-3 rounded border border-border dark:border-border">
                        <p className="text-muted-foreground dark:text-muted-foreground mb-1">Account Number:</p>
                        <p className="font-semibold text-foreground dark:text-foreground">001 313 802</p>
                      </div>
                      <div className="pt-2">
                        <p className="text-muted-foreground dark:text-muted-foreground mb-2">Or tap the link below to send payment:</p>
                        <a 
                          href="https://pay.ababank.com/oRF8?af_dp=abamobilebank%3A%2F%2F&af_siteid=968860649&pid=af_app_invites&acc=001313802&link_action=abaqr&af_web_dp=https%3A%2F%2Flink.payway.com.kh%2Faba%3Fid%3D1E47E983C4AC%26code%3D780728%26acc%3D001313802%26dynamic%3Dtrue&userid=1E47E983C4AC&&c=abaqr&code=780728&created_from_app=true&af_android_url=https%3A%2F%2Flink.payway.com.kh%2Faba%3Fid%3D1E47E983C4AC%26code%3D780728%26acc%3D001313802%26dynamic%3Dtrue&af_referrer_uid=1726316744902-9536747&af_ios_url=https%3A%2F%2Flink.payway.com.kh%2Faba%3Fid%3D1E47E983C4AC%26code%3D780728%26acc%3D001313802%26dynamic%3Dtrue"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all text-xs"
                        >
                          Open ABA Payment Link
                        </a>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="card" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="cardNumber" className="text-foreground">Card Number</Label>
                      <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                    </div>
                    <div>
                      <Label htmlFor="expiry" className="text-foreground">Expiry Date</Label>
                      <Input id="expiry" placeholder="MM/YY" />
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-foreground">CVV</Label>
                      <Input id="cvv" placeholder="123" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="cardName" className="text-foreground">Cardholder Name</Label>
                      <Input id="cardName" placeholder="John Doe" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bank" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bankName" className="text-foreground">Bank Name</Label>
                      <Input id="bankName" placeholder="Select your bank" />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber" className="text-foreground">Account Number</Label>
                      <Input id="accountNumber" placeholder="Enter account number" />
                    </div>
                    <div className="bg-warning/15 border border-warning/30 p-4 rounded-lg">
                      <p className="text-sm text-warning">
                        Bank transfer may take 1-3 business days to process. Your subscription will be activated upon payment confirmation.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Coupon Code Section */}
              <div className="space-y-3">
                <Label className="text-foreground">Have a Coupon Code?</Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-4 bg-success/15 border border-success/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      <span className="font-semibold text-success">{appliedCoupon.code}</span>
                      <Badge className="bg-success text-foreground">-{appliedCoupon.discount}%</Badge>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter coupon code (try DEMO100)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        className="flex-1 bg-card border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <Button
                        onClick={handleApplyCoupon}
                        variant="outline"
                        className="border-border text-foreground hover:bg-card"
                      >
                        Apply
                      </Button>
                    </div>
                    {couponError && (
                      <p className="text-sm text-error">{couponError}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">Try:</span>
                      <button
                        onClick={() => { setCouponCode('DEMO100'); }}
                        className="text-xs px-2 py-1 bg-success/15 text-success rounded hover:bg-success/20 transition-colors"
                      >
                        DEMO100 (100% OFF!)
                      </button>
                      <button
                        onClick={() => { setCouponCode('WELCOME50'); }}
                        className="text-xs px-2 py-1 bg-primary/15 text-primary rounded hover:bg-primary/20 transition-colors"
                      >
                        WELCOME50 (50% OFF)
                      </button>
                      <button
                        onClick={() => { setCouponCode('SAVE20'); }}
                        className="text-xs px-2 py-1 bg-primary/15 text-foreground rounded hover:bg-primary/20 transition-colors"
                      >
                        SAVE20 (20% OFF)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Security Notice */}
              <div className="bg-success/15 border border-success/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-success" />
                  <span className="font-semibold text-success">Secure Payment</span>
                </div>
                <p className="text-sm text-success">
                  Your payment information is encrypted and secure. We never store your payment details.
                </p>
              </div>

              {/* Payment Button */}
              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing Payment...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {appliedCoupon?.discount === 100 ? (
                      'Activate FREE Trial'
                    ) : (
                      `Pay $${finalPrice.toFixed(2)} - ${billingCycle === 'monthly' ? 'Monthly' : 'Annual'}`
                    )}
                  </div>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By completing this purchase, you agree to our Terms of Service and Privacy Policy. 
                You can cancel your subscription at any time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredTier?: 'free' | 'premium' | 'business';
  userTier: string;
  feature: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredTier = 'free', 
  userTier, 
  feature 
}) => {
  const tierLevels = { free: 0, premium: 1, business: 2 };
  const userLevel = tierLevels[userTier as keyof typeof tierLevels] || 0;
  const requiredLevel = tierLevels[requiredTier];

  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-warning" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2 text-center">
          {feature} Requires {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} Plan
        </h3>
        
        <p className="text-muted-foreground text-center mb-6">
          Upgrade your plan to access this feature and unlock advanced capabilities.
        </p>
        
        <div className="flex gap-2">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Shield className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
          <Button variant="outline">
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export { AuthGuard };
export default AuthGuard;

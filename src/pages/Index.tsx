import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, UserPlus, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const roleCards = [
    {
      title: "Pre-Registration",
      description: "Register your visit and get instant QR code access",
      icon: UserPlus,
      gradient: "from-primary to-primary/80",
      action: () => navigate("/pre-registration"),
      buttonText: "Register Visit"
    },
    {
      title: "Security",
      description: "Scan visitor QR codes and manage check-ins/check-outs",
      icon: Shield,
      gradient: "from-secondary to-secondary/80",
      action: () => navigate("/security"),
      buttonText: "Security Portal"
    },
    {
      title: "Admin",
      description: "Manage employees, visitors, and system settings",
      icon: Settings,
      gradient: "from-accent to-accent/80",
      action: () => navigate("/admin"),
      buttonText: "Admin Panel"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col items-center justify-center p-4">
      <div className="max-w-6xl w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Visitor Management System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your visitor experience with secure pre-registration, real-time approvals, and seamless check-in/check-out
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {roleCards.map((card, index) => (
            <Card 
              key={card.title}
              className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:-translate-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
              
              <div className="p-8 space-y-6 relative z-10">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                  <card.icon className="w-8 h-8 text-white" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">
                    {card.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {card.description}
                  </p>
                </div>

                <Button 
                  onClick={card.action}
                  className={`w-full bg-gradient-to-r ${card.gradient} hover:opacity-90 transition-all duration-300 transform group-hover:scale-105 shadow-lg`}
                  size="lg"
                >
                  {card.buttonText}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Secure • Fast • Reliable</p>
        </div>
      </div>
    </div>
  );
};

export default Index;

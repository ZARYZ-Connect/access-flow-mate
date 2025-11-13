import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, ScanLine, CheckCircle, XCircle, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Security = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [visitorIdInput, setVisitorIdInput] = useState("");
  const [scannedData, setScannedData] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkUser();
  }, [navigate]);

  const { data: recentCheckIns } = useQuery({
    queryKey: ["recent-check-ins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select(`
          *,
          visitors (*),
          appointments (*)
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleVisitorIdLookup = async () => {
    if (!visitorIdInput.trim()) {
      toast({
        title: "Enter Visitor ID",
        description: "Please enter a visitor ID to look up.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: visitor, error } = await supabase
        .from("visitors")
        .select("*")
        .eq("visitor_id", visitorIdInput.trim())
        .single();

      if (error || !visitor) {
        toast({
          title: "Visitor Not Found",
          description: "No visitor found with this ID.",
          variant: "destructive",
        });
        return;
      }

      setScannedData({
        visitorId: visitor.visitor_id,
        name: visitor.name,
        email: visitor.email,
        phone: visitor.phone,
      });

      toast({
        title: "Visitor Found",
        description: `Visitor: ${visitor.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Lookup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckIn = async () => {
    if (!scannedData) return;

    try {
      // Find visitor by visitor_id
      const { data: visitor, error: visitorError } = await supabase
        .from("visitors")
        .select("*, appointments(*)")
        .eq("visitor_id", scannedData.visitorId)
        .single();

      if (visitorError) throw visitorError;

      // Find pending appointment
      const pendingAppointment = visitor.appointments?.find(
        (apt: any) => apt.status === "approved"
      );

      if (!pendingAppointment) {
        toast({
          title: "No Approved Appointment",
          description: "This visitor doesn't have an approved appointment.",
          variant: "destructive",
        });
        return;
      }

      // Create check-in record
      const { error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          visitor_id: visitor.id,
          appointment_id: pendingAppointment.id,
          checked_in_at: new Date().toISOString(),
          security_user_id: user?.id,
        });

      if (checkInError) throw checkInError;

      toast({
        title: "Check-In Successful",
        description: `${visitor.name} has been checked in.`,
      });

      setScannedData(null);
    } catch (error: any) {
      toast({
        title: "Check-In Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async (checkInId: string) => {
    try {
      const { error } = await supabase
        .from("check_ins")
        .update({
          checked_out_at: new Date().toISOString(),
        })
        .eq("id", checkInId);

      if (error) throw error;

      toast({
        title: "Check-Out Successful",
        description: "Visitor has been checked out.",
      });
    } catch (error: any) {
      toast({
        title: "Check-Out Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background p-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Security Portal</h1>
              <p className="text-muted-foreground">Scan QR codes and manage visitor check-ins</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Visitor ID Lookup */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Hash className="w-5 h-5 text-secondary" />
              Visitor ID Lookup
            </h2>

            {scannedData ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">Visitor Information</p>
                  <p className="font-semibold text-lg">{scannedData.name}</p>
                  <p className="text-sm">{scannedData.email}</p>
                  <p className="text-sm">{scannedData.phone}</p>
                  <p className="text-xs text-muted-foreground mt-2">ID: {scannedData.visitorId}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleCheckIn}
                    className="flex-1 bg-gradient-to-r from-secondary to-secondary/80"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Check In
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScannedData(null);
                      setVisitorIdInput("");
                    }}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="visitorId">Enter Visitor ID</Label>
                  <Input
                    id="visitorId"
                    value={visitorIdInput}
                    onChange={(e) => setVisitorIdInput(e.target.value)}
                    placeholder="VIS..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleVisitorIdLookup();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleVisitorIdLookup}
                  className="w-full bg-gradient-to-r from-secondary to-secondary/80 hover:opacity-90"
                  size="lg"
                >
                  <ScanLine className="w-5 h-5 mr-2" />
                  Look Up Visitor
                </Button>
              </div>
            )}
          </Card>

          {/* Recent Check-ins */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Recent Check-ins</h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {recentCheckIns && recentCheckIns.length > 0 ? (
                recentCheckIns.map((checkIn: any) => (
                  <div
                    key={checkIn.id}
                    className="bg-muted p-4 rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{checkIn.visitors?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {checkIn.visitors?.email}
                        </p>
                      </div>
                      {!checkIn.checked_out_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckOut(checkIn.id)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Check Out
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        In: {new Date(checkIn.checked_in_at).toLocaleString()}
                      </span>
                      {checkIn.checked_out_at && (
                        <span>
                          Out: {new Date(checkIn.checked_out_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent check-ins
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Security;

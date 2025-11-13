import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Users, UserCheck, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

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

  // Fetch all visitors
  const { data: visitors } = useQuery({
    queryKey: ["visitors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all appointments
  const { data: appointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          visitors (*),
          employees (*)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all employees
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all check-ins
  const { data: checkIns } = useQuery({
    queryKey: ["check-ins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select(`
          *,
          visitors (*),
          appointments (*)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleApproveAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          calendar_blocked: true,
        })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment Approved",
        description: "The visitor has been notified.",
      });
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeclineAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "declined" })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment Declined",
        description: "The visitor has been notified.",
      });
    } catch (error: any) {
      toast({
        title: "Decline Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning";
      case "approved": return "bg-success";
      case "declined": return "bg-destructive";
      case "completed": return "bg-muted";
      default: return "bg-muted";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background p-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage visitors, employees, and appointments</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Visitors</p>
                <p className="text-2xl font-bold">{visitors?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-warning/10 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {appointments?.filter(a => a.status === "pending").length || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-success/10 p-3 rounded-lg">
                <UserCheck className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Checked In</p>
                <p className="text-2xl font-bold">
                  {checkIns?.filter(c => c.checked_in_at && !c.checked_out_at).length || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-accent/10 p-3 rounded-lg">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{employees?.length || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">All Appointments</h2>
              <div className="space-y-3">
                {appointments && appointments.length > 0 ? (
                  appointments.map((appointment: any) => (
                    <div
                      key={appointment.id}
                      className="bg-muted p-4 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{appointment.visitors?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Meeting: {appointment.employees?.name}
                          </p>
                          <p className="text-sm">{appointment.purpose}</p>
                          <p className="text-xs text-muted-foreground">
                            {appointment.visit_date} at {appointment.visit_time}
                          </p>
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                      
                      {appointment.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveAppointment(appointment.id)}
                            className="bg-success hover:bg-success/90"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineAppointment(appointment.id)}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No appointments found
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Visitors Tab */}
          <TabsContent value="visitors">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">All Visitors</h2>
              <div className="space-y-3">
                {visitors && visitors.length > 0 ? (
                  visitors.map((visitor: any) => (
                    <div key={visitor.id} className="bg-muted p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{visitor.name}</p>
                          <p className="text-sm text-muted-foreground">{visitor.email}</p>
                          <p className="text-sm text-muted-foreground">{visitor.phone}</p>
                          {visitor.company && (
                            <p className="text-sm">Company: {visitor.company}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            ID: {visitor.visitor_id}
                          </p>
                          <Badge variant={visitor.email_verified ? "default" : "secondary"} className="mt-2">
                            {visitor.email_verified ? "Verified" : "Unverified"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No visitors found
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">All Employees</h2>
                <Button size="sm" className="bg-accent hover:bg-accent/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </div>
              <div className="space-y-3">
                {employees && employees.length > 0 ? (
                  employees.map((employee: any) => (
                    <div key={employee.id} className="bg-muted p-4 rounded-lg">
                      <p className="font-semibold">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                      {employee.department && (
                        <p className="text-sm">Department: {employee.department}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No employees found
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Check-ins Tab */}
          <TabsContent value="checkins">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">All Check-ins</h2>
              <div className="space-y-3">
                {checkIns && checkIns.length > 0 ? (
                  checkIns.map((checkIn: any) => (
                    <div key={checkIn.id} className="bg-muted p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{checkIn.visitors?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {checkIn.visitors?.email}
                          </p>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p>
                              Checked In: {new Date(checkIn.checked_in_at).toLocaleString()}
                            </p>
                            {checkIn.checked_out_at && (
                              <p>
                                Checked Out: {new Date(checkIn.checked_out_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={checkIn.checked_out_at ? "secondary" : "default"}>
                          {checkIn.checked_out_at ? "Completed" : "Active"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No check-ins found
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

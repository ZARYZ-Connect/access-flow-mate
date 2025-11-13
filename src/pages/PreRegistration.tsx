import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Mail, Phone, User, Building2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";

const PreRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    employeeId: "",
    purpose: "",
    visitDate: "",
    visitTime: "",
  });

  // Fetch employees for "whom to meet" selection
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateVisitorId = () => {
    return `VIS${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate unique visitor ID
      const newVisitorId = generateVisitorId();

      // Create visitor
      const { data: visitor, error: visitorError } = await supabase
        .from("visitors")
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          visitor_id: newVisitorId,
          email_verified: false,
        })
        .select()
        .single();

      if (visitorError) throw visitorError;

      // Create appointment
      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          visitor_id: visitor.id,
          employee_id: formData.employeeId,
          purpose: formData.purpose,
          visit_date: formData.visitDate,
          visit_time: formData.visitTime,
          status: "pending",
        });

      if (appointmentError) throw appointmentError;

      // Generate QR code
      const qrData = JSON.stringify({
        visitorId: newVisitorId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
      });

      // Update visitor with QR code
      await supabase
        .from("visitors")
        .update({ qr_code: qrCodeDataUrl })
        .eq("id", visitor.id);

      setQrCode(qrCodeDataUrl);
      setVisitorId(newVisitorId);

      toast({
        title: "Registration Successful!",
        description: "Your QR code has been generated. An approval request has been sent to the employee.",
      });

    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (qrCode && visitorId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Registration Complete!</h2>
            <p className="text-muted-foreground">Your visitor ID and QR code</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-inner">
            <img src={qrCode} alt="Visitor QR Code" className="w-full max-w-xs mx-auto" />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Visitor ID</p>
            <p className="text-2xl font-bold text-primary">{visitorId}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              An approval request has been sent to the employee. Please wait for confirmation email.
            </p>
            <p className="text-sm font-medium text-foreground">
              Show this QR code to security on your arrival.
            </p>
          </div>

          <Button onClick={() => navigate("/")} className="w-full" size="lg">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background p-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Visitor Pre-Registration</h1>
            <p className="text-muted-foreground">Fill in your details to register your visit</p>
          </div>
        </div>

        {/* Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="john@example.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company/Organization</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      placeholder="Acme Corp"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Visit Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="employee">Whom to Meet *</Label>
                <Select
                  required
                  value={formData.employeeId}
                  onValueChange={(value) => handleInputChange("employeeId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesLoading ? (
                      <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                    ) : employees && employees.length > 0 ? (
                      employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name} {employee.department && `- ${employee.department}`}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No employees found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Visit *</Label>
                <Textarea
                  id="purpose"
                  required
                  value={formData.purpose}
                  onChange={(e) => handleInputChange("purpose", e.target.value)}
                  placeholder="Brief description of your visit purpose..."
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visitDate">Visit Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="visitDate"
                      type="date"
                      required
                      value={formData.visitDate}
                      onChange={(e) => handleInputChange("visitDate", e.target.value)}
                      className="pl-10"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visitTime">Visit Time *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="visitTime"
                      type="time"
                      required
                      value={formData.visitTime}
                      onChange={(e) => handleInputChange("visitTime", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Registration"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PreRegistration;

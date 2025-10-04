import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package, LogOut, CheckCircle, X, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.jpg";

interface DeliveryPartnerDashboardProps {
  user: User;
}

interface Customer {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

interface Delivery {
  id: string;
  delivery_date: string;
  delivery_status: string;
  items: string;
  delivery_address: string;
  customer_id: string;
}

const DeliveryPartnerDashboard = ({ user }: DeliveryPartnerDashboardProps) => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDeliveries, setCustomerDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, user_id, profiles(full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDeliveries = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .eq("customer_id", customerId)
        .order("delivery_date", { ascending: false });

      if (error) throw error;
      setCustomerDeliveries(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch deliveries");
    }
  };

  const handleMarkDelivered = async (deliveryId: string) => {
    try {
      const { error } = await supabase
        .from("deliveries")
        .update({
          delivery_status: "delivered",
          delivered_at: new Date().toISOString()
        })
        .eq("id", deliveryId);

      if (error) throw error;

      toast.success("Delivery marked as delivered!");
      if (selectedCustomer) {
        fetchCustomerDeliveries(selectedCustomer.id);
      }
    } catch (error: any) {
      toast.error("Failed to update delivery status");
    }
  };

  const handleMarkNotDelivered = async (deliveryId: string) => {
    try {
      const { error } = await supabase
        .from("deliveries")
        .update({
          delivery_status: "failed",
          delivered_at: null
        })
        .eq("id", deliveryId);

      if (error) throw error;

      toast.success("Delivery marked as not delivered!");
      if (selectedCustomer) {
        fetchCustomerDeliveries(selectedCustomer.id);
      }
    } catch (error: any) {
      toast.error("Failed to update delivery status");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="The Fruit Union" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl font-bold">Delivery Partner Dashboard</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading customers...</p>
            ) : customers.length === 0 ? (
              <p className="text-muted-foreground">No customers found.</p>
            ) : (
              <div className="space-y-4">
                {customers.map((customer) => (
                  <Card key={customer.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{customer.profiles?.full_name}</p>
                        <Dialog 
                          open={showDeliveryDialog && selectedCustomer?.id === customer.id} 
                          onOpenChange={(open) => {
                            setShowDeliveryDialog(open);
                            if (open) {
                              setSelectedCustomer(customer);
                              fetchCustomerDeliveries(customer.id);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline">View Deliveries</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Deliveries - {customer.profiles?.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {customerDeliveries.length === 0 ? (
                                <p className="text-muted-foreground">No deliveries for this customer.</p>
                              ) : (
                                customerDeliveries.map((delivery) => (
                                  <Card key={delivery.id}>
                                    <CardContent className="pt-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <Badge variant={
                                            delivery.delivery_status === "delivered" ? "default" :
                                            delivery.delivery_status === "in_transit" ? "secondary" :
                                            "outline"
                                          }>
                                            {delivery.delivery_status}
                                          </Badge>
                                          <span className="text-sm text-muted-foreground">
                                            {new Date(delivery.delivery_date).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <p><strong>Items:</strong> {delivery.items}</p>
                                        <p><strong>Address:</strong> {delivery.delivery_address}</p>
                                        {delivery.delivery_status !== "delivered" && (
                                          <div className="flex gap-2 mt-4">
                                            <Button 
                                              size="sm"
                                              onClick={() => handleMarkDelivered(delivery.id)}
                                            >
                                              <CheckCircle className="mr-2 h-4 w-4" />
                                              Mark Delivered
                                            </Button>
                                            <Button 
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleMarkNotDelivered(delivery.id)}
                                            >
                                              <X className="mr-2 h-4 w-4" />
                                              Not Delivered
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DeliveryPartnerDashboard;

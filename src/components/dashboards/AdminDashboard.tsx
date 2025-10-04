import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Package, Truck, LogOut, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.jpg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminDashboardProps {
  user: User;
}

interface Customer {
  id: string;
  user_id: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_start_date: string;
  subscription_end_date: string;
  next_payment_date: string;
  profiles: {
    full_name: string;
    phone: string | null;
  };
}

interface Delivery {
  id: string;
  delivery_date: string;
  delivery_status: string;
  items: string;
  delivery_address: string;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalDeliveries: 0,
    totalPartners: 0,
    activeDeliveries: 0
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDeliveries, setCustomerDeliveries] = useState<Delivery[]>([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  
  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    fullName: "",
    username: "",
    password: "",
    phone: "",
    subscriptionPlan: "monthly",
    subscriptionStatus: "inactive",
    deliveryAddress: ""
  });

  useEffect(() => {
    fetchStats();
    fetchCustomers();
  }, []);

  const fetchStats = async () => {
    try {
      const [customers, deliveries, partners] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact" }),
        supabase.from("deliveries").select("*", { count: "exact" }),
        supabase.from("delivery_partners").select("*", { count: "exact" })
      ]);

      const activeDeliveries = await supabase
        .from("deliveries")
        .select("*", { count: "exact" })
        .in("delivery_status", ["pending", "assigned", "in_transit"]);

      setStats({
        totalCustomers: customers.count || 0,
        totalDeliveries: deliveries.count || 0,
        totalPartners: partners.count || 0,
        activeDeliveries: activeDeliveries.count || 0
      });
    } catch (error: any) {
      toast.error("Failed to fetch statistics");
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*, profiles(full_name, phone)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch customers");
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

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create auth user with username as email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${newCustomer.username}@fruitunion.local`,
        password: newCustomer.password,
        options: {
          data: {
            full_name: newCustomer.fullName,
            phone: newCustomer.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Wait a bit for profile to be created by trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Assign customer role
      await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "customer"
      });

      // Create customer record
      await supabase.from("customers").insert({
        user_id: authData.user.id,
        subscription_plan: newCustomer.subscriptionPlan,
        subscription_status: newCustomer.subscriptionStatus,
        subscription_start_date: new Date().toISOString().split('T')[0],
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      toast.success("Customer added successfully!");
      setShowAddCustomer(false);
      setNewCustomer({
        fullName: "",
        username: "",
        password: "",
        phone: "",
        subscriptionPlan: "monthly",
        subscriptionStatus: "inactive",
        deliveryAddress: ""
      });
      fetchCustomers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to add customer");
    }
  };

  const handleUpdateSubscription = async (customerId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("customers")
        .update({ subscription_status: status })
        .eq("id", customerId);

      if (error) throw error;
      toast.success("Subscription updated!");
      fetchCustomers();
    } catch (error: any) {
      toast.error("Failed to update subscription");
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
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeDeliveries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Delivery Partners</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPartners}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Customer Management</CardTitle>
            <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddCustomer} className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={newCustomer.fullName}
                      onChange={(e) => setNewCustomer({...newCustomer, fullName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Username (for login)</Label>
                    <Input
                      value={newCustomer.username}
                      onChange={(e) => setNewCustomer({...newCustomer, username: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={newCustomer.password}
                      onChange={(e) => setNewCustomer({...newCustomer, password: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Subscription Plan</Label>
                    <Select value={newCustomer.subscriptionPlan} onValueChange={(value) => setNewCustomer({...newCustomer, subscriptionPlan: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Add Customer</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customers.map((customer) => (
                <Card key={customer.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{customer.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{customer.profiles?.phone}</p>
                        <p className="text-sm">Plan: {customer.subscription_plan}</p>
                        <p className="text-sm">Status: {customer.subscription_status}</p>
                        <p className="text-sm">Next Payment: {customer.next_payment_date}</p>
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={customer.subscription_status}
                          onValueChange={(value) => handleUpdateSubscription(customer.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <Dialog open={showDeliveryDialog && selectedCustomer?.id === customer.id} onOpenChange={(open) => {
                          setShowDeliveryDialog(open);
                          if (open) {
                            setSelectedCustomer(customer);
                            fetchCustomerDeliveries(customer.id);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">View Deliveries</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Delivery History - {customer.profiles?.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {customerDeliveries.length === 0 ? (
                                <p className="text-muted-foreground">No deliveries yet</p>
                              ) : (
                                customerDeliveries.map((delivery) => (
                                  <Card key={delivery.id}>
                                    <CardContent className="pt-4">
                                      <p><strong>Date:</strong> {delivery.delivery_date}</p>
                                      <p><strong>Status:</strong> {delivery.delivery_status}</p>
                                      <p><strong>Items:</strong> {delivery.items}</p>
                                      <p><strong>Address:</strong> {delivery.delivery_address}</p>
                                    </CardContent>
                                  </Card>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;

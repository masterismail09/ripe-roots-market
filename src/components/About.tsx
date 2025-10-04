import { Leaf, Heart, Truck } from "lucide-react";

const features = [
  {
    icon: Leaf,
    title: "100% Organic",
    description: "All our fruits are certified organic, grown without harmful pesticides or chemicals.",
  },
  {
    icon: Heart,
    title: "Farm Fresh",
    description: "Sourced directly from local farms, ensuring maximum freshness and quality.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Same-day delivery available. From farm to your table in hours, not days.",
  },
];

const About = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose Us</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're passionate about bringing you the freshest, healthiest fruits
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="text-center group hover:scale-105 transition-transform duration-300"
              >
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default About;

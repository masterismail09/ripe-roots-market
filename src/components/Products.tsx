import { Card, CardContent } from "@/components/ui/card";
import applesImage from "@/assets/apples.jpg";
import citrusImage from "@/assets/citrus.jpg";
import berriesImage from "@/assets/berries.jpg";
import tropicalImage from "@/assets/tropical.jpg";

const products = [
  {
    name: "Fresh Apples",
    description: "Crisp and sweet organic apples",
    image: applesImage,
  },
  {
    name: "Citrus Selection",
    description: "Zesty oranges, lemons & limes",
    image: citrusImage,
  },
  {
    name: "Berry Mix",
    description: "Handpicked seasonal berries",
    image: berriesImage,
  },
  {
    name: "Tropical Fruits",
    description: "Exotic fruits from paradise",
    image: tropicalImage,
  },
];

const Products = () => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Products</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Handpicked selection of the freshest fruits, delivered with care
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product, index) => (
            <Card
              key={index}
              className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-border bg-card"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Products;

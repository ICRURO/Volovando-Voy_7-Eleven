export const initialInventory = [
  {
    id: 1,
    nombre: "Volován de Jamón y Queso",
    categoria: "Volovanes Clásicos",
    precio: 25.00,
    stock: 35,
    stockMinimo: 10,
    imagen: "../../../assets/volovan.png"
  },
  {
    id: 2,
    nombre: "Volován de Pollo",
    categoria: "Volovanes Clásicos",
    precio: 25.00,
    stock: 8,
    stockMinimo: 10,
    imagen: "../../../assets/volovan.png"
  },
  {
    id: 3,
    nombre: "Volován de Atún",
    categoria: "Volovanes Clásicos",
    precio: 28.00,
    stock: 14,
    stockMinimo: 8,
    imagen: "../../../assets/volovan.png"
  },
  {
    id: 4,
    nombre: "Volován Dulce (Piña/Nutella)",
    categoria: "Especiales",
    precio: 30.00,
    stock: 4,
    stockMinimo: 6,
    imagen: "../../../assets/volovino.png"
  },
  {
    id: 5,
    nombre: "Refresco 600ml",
    categoria: "Bebidas",
    precio: 18.00,
    stock: 22,
    stockMinimo: 10,
    imagen: "../../../assets/volovino.png"
  }
];

export function getInventory() {
  const saved = localStorage.getItem("inventory_data");
  if (!saved) {
    localStorage.setItem("inventory_data", JSON.stringify(initialInventory));
    return initialInventory;
  }
  return JSON.parse(saved);
}

export function saveInventory(data) {
  localStorage.setItem("inventory_data", JSON.stringify(data));
}
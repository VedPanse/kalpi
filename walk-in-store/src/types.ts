/** One product, as the Python helper returns it from a store's products.json. */
export interface Product {
  id: number;
  title: string;
  vendor: string;
  type: string;
  handle: string;
  price: string | null;
  variant_id: number;
  image: string;
}

export interface StoreData {
  store: string;
  products: Product[];
}

/** An area on the floor you can't walk into (x/z in metres). */
export interface Block {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

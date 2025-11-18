export type Category = {
    id: string;
    name: string;
    description?: string;
};

export type SubCategory = {
    id: string;
    categoryId: string;
    name: string;
    description?: string;
};

export type Product = {
    id: string;
    subCategoryId: string;
    name: string;
    price: number;
    description?: string;
    inStock: boolean;
};

export type User = {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    isAdmin: boolean;
};

export type CartItem = {
    productId: string;
    quantity: number;
};

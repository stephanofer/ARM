import { atom } from "nanostores";
import type { Product } from "@/types";

export const $products = atom<Product[]>([]);
export const $totalProducts = atom<number>(0);
export const $isLoading = atom<boolean>(false);

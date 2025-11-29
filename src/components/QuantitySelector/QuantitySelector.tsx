import { useState, useCallback } from "preact/hooks";
import { MIN_QUANTITY, MAX_QUANTITY, clampQuantity } from "@/stores/cart";
import styles from "./QuantitySelector.module.css";

interface QuantitySelectorProps {
  /** Valor inicial */
  initialValue?: number;
  /** Callback cuando cambia la cantidad */
  onChange?: (quantity: number) => void;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Selector de cantidad reutilizable.
 * Maneja la validación automática del rango permitido.
 */
export function QuantitySelector({
  initialValue = MIN_QUANTITY,
  onChange,
  className = "",
}: QuantitySelectorProps) {
  const [quantity, setQuantityState] = useState(() => clampQuantity(initialValue));

  const updateQuantity = useCallback((newValue: number) => {
    const clamped = clampQuantity(newValue);
    setQuantityState(clamped);
    onChange?.(clamped);
  }, [onChange]);

  const handleDecrease = () => {
    if (quantity > MIN_QUANTITY) {
      updateQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < MAX_QUANTITY) {
      updateQuantity(quantity + 1);
    }
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    
    // Si está vacío o no es número, no actualizamos aún (esperar blur)
    if (target.value === "" || isNaN(value)) return;
    
    // Validar en tiempo real: si excede el máximo, corregir inmediatamente
    if (value > MAX_QUANTITY) {
      target.value = MAX_QUANTITY.toString();
      updateQuantity(MAX_QUANTITY);
      return;
    }
    
    // Si es válido, actualizar
    if (value >= MIN_QUANTITY) {
      updateQuantity(value);
    }
  };

  const handleBlur = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    
    // Al perder foco, asegurar valor válido
    const validValue = clampQuantity(value);
    target.value = validValue.toString();
    
    if (validValue !== quantity) {
      updateQuantity(validValue);
    }
  };

  return (
    <div className={`${styles.quantitySelector} ${className}`}>
      <button
        type="button"
        className={styles.quantityBtn}
        onClick={handleDecrease}
        disabled={quantity <= MIN_QUANTITY}
        aria-label="Disminuir cantidad"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      
      <input
        type="number"
        className={styles.quantityInput}
        value={quantity}
        min={MIN_QUANTITY}
        max={MAX_QUANTITY}
        onInput={handleInputChange}
        onBlur={handleBlur}
        aria-label="Cantidad"
      />
      
      <button
        type="button"
        className={styles.quantityBtn}
        onClick={handleIncrease}
        disabled={quantity >= MAX_QUANTITY}
        aria-label="Aumentar cantidad"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

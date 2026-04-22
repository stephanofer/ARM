# 📋 GUÍA DE PRUEBAS MANUALES - SISTEMA ARM
## PARTE 2: GESTIÓN DE SUBCATEGORÍAS Y FILTROS

---

## 🎯 OBJETIVO DE ESTA PARTE

Probar la creación, edición y eliminación de subcategorías, así como la configuración avanzada de filtros dinámicos que se usarán en el catálogo público.

---

## 📦 SECCIÓN 3: GESTIÓN DE SUBCATEGORÍAS

### PRE-REQUISITOS
- Haber completado la PARTE 1
- Tener al menos 2 categorías creadas
- Estar autenticado como admin

---


## 🎛️ SECCIÓN 4: CONFIGURACIÓN DE FILTROS DINÁMICOS

### PRE-REQUISITOS
- Tener subcategorías creadas (Pruebas 3.2-3.6)
- Entender los 4 tipos de filtros:
  - **select**: Lista desplegable (ej: Tamaño: Pequeño, Mediano, Grande)
  - **checkbox**: Múltiples opciones (ej: Características: Apilable, Giratorio)
  - **range**: Rango numérico (ej: Peso: 0-100 kg)
  - **boolean**: Sí/No (ej: ¿Con ruedas?)



## 📊 RESUMEN DE RESULTADOS - PARTE 2

| # Prueba | Descripción | Estado | Notas |
|----------|-------------|--------|-------|
| 3.1 | Acceso subcategorías | ⬜ | |
| 3.2 | Crear subcat básica | ⬜ | |
| 3.3 | Validación nombre vacío | ⬜ | |
| 3.4 | Validación categoría padre | ⬜ | |
| 3.5 | Slug duplicado | ⬜ | |
| 3.6 | Múltiples subcats | ⬜ | |
| 3.7 | Editar nombre | ⬜ | |
| 3.8 | Cambiar categoría padre | ⬜ | |
| 3.9 | Eliminar sin productos | ⬜ | |
| 4.1 | Filtro tipo SELECT | ⬜ | |
| 4.2 | Filtro tipo CHECKBOX | ⬜ | |
| 4.3 | Filtro tipo RANGE | ⬜ | |
| 4.4 | Filtro tipo BOOLEAN | ⬜ | |
| 4.5 | Validar key duplicada | ⬜ | |
| 4.6 | Validar opciones vacías | ⬜ | |
| 4.7 | Editar filtro | ⬜ | |
| 4.8 | Eliminar filtro | ⬜ | |
| 4.9 | Múltiples filtros complejos | ⬜ | |
| 4.10 | Orden de filtros | ⬜ | |
| 4.11 | Caracteres especiales | ⬜ | |

---

## ✅ CHECKLIST PREVIO A LA PARTE 3

Antes de continuar, asegúrate de tener:

- [ ] Al menos 4-5 subcategorías creadas
- [ ] Subcategorías con filtros configurados de diferentes tipos
- [ ] Una subcategoría con todos los tipos de filtros (Prueba 4.9)
- [ ] Relaciones correctas entre categorías y subcategorías
- [ ] Sin errores en la configuración de filtros

---

## 📚 CONTINÚA CON

**PARTE 3: Gestión de Productos (CRUD Básico)**

En la siguiente parte probarás:
- Crear productos con diferentes configuraciones
- Validaciones de productos
- Relación con categorías y subcategorías
- Campos de atributos dinámicos basados en filtros

---

**FIN DE LA PARTE 2** 🎉

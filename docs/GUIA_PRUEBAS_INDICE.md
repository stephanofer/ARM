# 📋 GUÍA COMPLETA DE PRUEBAS MANUALES - SISTEMA ARM
## ÍNDICE MAESTRO Y GUÍA DE USO

---

## 🎯 BIENVENIDO A LA GUÍA COMPLETA DE TESTING

Esta es una guía profesional y exhaustiva para probar manualmente **TODAS** las funcionalidades del sistema de catálogo ARM. La guía está dividida en 6 partes manejables para facilitar su uso.

**Autor**: Ingeniero Senior con 30+ años de experiencia  
**Versión**: 1.0  
**Fecha**: Diciembre 2025  
**Total de Pruebas**: **128 pruebas manuales**

---

## 📚 ESTRUCTURA DE LA GUÍA

### [PARTE 1: AUTENTICACIÓN Y GESTIÓN DE CATEGORÍAS](./GUIA_PRUEBAS_PARTE_1.md)
**16 pruebas** | Duración estimada: 45 minutos

#### Contenido:
- **Sección 1**: Autenticación (5 pruebas)
  - Login/Logout
  - Protección de rutas
  - Persistencia de sesión
  
- **Sección 2**: Gestión de Categorías (11 pruebas)
  - CRUD completo
  - Validaciones (nombre vacío, slug duplicado)
  - Generación automática de slugs
  - Caracteres especiales
  - Eliminación en cascada

**🎯 Objetivo**: Verificar que el sistema de autenticación y la gestión básica de categorías funciona correctamente.

---

### [PARTE 2: GESTIÓN DE SUBCATEGORÍAS Y FILTROS](./GUIA_PRUEBAS_PARTE_2.md)
**20 pruebas** | Duración estimada: 1 hora

#### Contenido:
- **Sección 3**: Gestión de Subcategorías (9 pruebas)
  - CRUD de subcategorías
  - Validaciones específicas
  - Relaciones con categorías padre
  
- **Sección 4**: Configuración de Filtros Dinámicos (11 pruebas)
  - Filtros tipo SELECT, CHECKBOX, RANGE, BOOLEAN
  - Validaciones de filtros
  - Edición y eliminación
  - Múltiples filtros complejos

**🎯 Objetivo**: Probar la configuración del sistema de filtros dinámicos que se usará en el catálogo público.

---

### [PARTE 3: CATÁLOGO PÚBLICO - NAVEGACIÓN Y LISTADO](./GUIA_PRUEBAS_PARTE_3.md)
**16 pruebas** | Duración estimada: 45 minutos

#### Contenido:
- **Sección 5**: Navegación y Listado Básico (7 pruebas)
  - Visualización de productos
  - Cards de producto
  - Imágenes con hover effect
  - Productos sin stock
  
- **Sección 6**: Tabs de Subcategorías (4 pruebas)
  - Navegación entre subcategorías
  - Cambio de contexto
  
- **Sección 7**: Navegación Directa por URL (5 pruebas)
  - URLs directas
  - Slugs inválidos
  - Botón atrás del navegador

**🎯 Objetivo**: Verificar que el catálogo público muestra correctamente los productos y permite navegar por categorías/subcategorías.

**📖 INCLUYE**: Explicación detallada de la arquitectura del sistema de búsqueda y filtros.

---

### [PARTE 4: FILTROS DINÁMICOS Y BÚSQUEDA](./GUIA_PRUEBAS_PARTE_4.md)
**22 pruebas** | Duración estimada: 1.5 horas

#### Contenido:
- **Sección 8**: Filtros tipo SELECT (4 pruebas)
- **Sección 9**: Filtros tipo CHECKBOX (5 pruebas)
- **Sección 10**: Filtros de Precio RANGE (4 pruebas)
- **Sección 11**: Filtros tipo BOOLEAN (2 pruebas)
- **Sección 12**: Combinación de Filtros (2 pruebas)
- **Sección 13**: Limpieza de Filtros (2 pruebas)
- **Sección 14**: Sincronización URL ↔ Filtros (3 pruebas)

**🎯 Objetivo**: Probar exhaustivamente el sistema de filtros dinámicos del catálogo público.

**📖 INCLUYE**: Explicación técnica de la función `applyFilters()` que es el corazón del sistema de filtrado.

---

### [PARTE 5: PAGINACIÓN, ORDENAMIENTO Y BÚSQUEDA](./GUIA_PRUEBAS_PARTE_5.md)
**25 pruebas** | Duración estimada: 1.5 horas

#### Contenido:
- **Sección 15**: Paginación (9 pruebas)
  - Navegación entre páginas
  - Páginas inválidas
  - Paginación + Filtros
  
- **Sección 16**: Ordenamiento (10 pruebas)
  - Ordenar por precio (asc/desc)
  - Ordenar por nombre (A-Z, Z-A)
  - Más recientes
  - Combinación con filtros y paginación
  
- **Sección 17**: Búsqueda Global (3 pruebas)
  - Búsqueda por nombre/descripción
  - Sin resultados
  
- **Sección 18**: Performance y Casos Extremos (3 pruebas)
  - Muchos productos (100+)
  - Cambios rápidos (race conditions)
  - Red lenta

**🎯 Objetivo**: Verificar que la paginación, ordenamiento y búsqueda funcionan correctamente, incluso en condiciones extremas.

---

### [PARTE 6: PÁGINA DE DETALLE Y CASOS FINALES](./GUIA_PRUEBAS_PARTE_6.md)
**29 pruebas** | Duración estimada: 2 horas

#### Contenido:
- **Sección 19**: Página de Detalle de Producto (7 pruebas)
  - Información completa
  - Breadcrumb
  - Galería de imágenes
  - Zoom/Modal
  
- **Sección 20**: Archivos Descargables (3 pruebas)
  - Visualización
  - Descarga
  
- **Sección 21**: Carrito de Compras (7 pruebas)
  - Agregar productos
  - Modificar cantidad
  - Persistencia
  
- **Sección 22**: Responsive Design (4 pruebas)
  - Mobile, Tablet, Desktop
  - Orientación
  
- **Sección 23**: Accesibilidad (3 pruebas)
  - Navegación por teclado
  - Alt text
  - Contraste
  
- **Sección 24**: Casos Extremos Finales (5 pruebas)
  - Slugs largos
  - Caracteres especiales
  - **🔴 Seguridad XSS (CRÍTICO)**

**🎯 Objetivo**: Probar la página de detalle, carrito, responsive, accesibilidad y casos extremos de seguridad.

---

## 🚀 CÓMO USAR ESTA GUÍA

### 1️⃣ Preparación Inicial

Antes de empezar, asegúrate de tener:

```bash
✅ Sistema corriendo localmente (npm run dev)
✅ Base de datos configurada con schema final.sql
✅ Credenciales de admin de Supabase
✅ Navegador con DevTools (Chrome/Firefox recomendado)
✅ Tiempo disponible (6-8 horas para toda la guía)
```

### 2️⃣ Orden Recomendado

**Sigue las partes en orden secuencial**: 1 → 2 → 3 → 4 → 5 → 6

Cada parte depende de la anterior (ej: necesitas categorías creadas antes de probar filtros).

### 3️⃣ Formato de Cada Prueba

Cada prueba incluye:

```
PRUEBA X.Y: [Nombre Descriptivo]

Objetivo: [Qué se está probando]

Datos de Prueba: [Datos específicos a usar]

Pasos: [Lista numerada de acciones]

Comportamiento Esperado ✅: [Qué DEBE pasar]

Comportamiento de Fallo ❌: [Qué NO debe pasar]

Estado:
- ✅ PASA si [condición]
- ❌ FALLA si [condición]
```

### 4️⃣ Registro de Resultados

Al final de cada parte hay una tabla de resumen:

```markdown
| # Prueba | Descripción | Estado | Notas |
|----------|-------------|--------|-------|
| 1.1      | Test X      | ✅     | Ok    |
| 1.2      | Test Y      | ❌     | Bug encontrado |
| 1.3      | Test Z      | ⚠️     | Pasa con observaciones |
```

Marca:
- ✅ Si PASA
- ❌ Si FALLA
- ⚠️ Si PASA pero con observaciones
- ⬜ Si aún no la ejecutaste

### 5️⃣ Reportar Bugs

Cuando encuentres un bug, usa este formato:

```markdown
PRUEBA: [número y nombre]
SEVERIDAD: [🔴 Crítico | 🟠 Alto | 🟡 Medio | 🟢 Bajo]

COMPORTAMIENTO ESPERADO:
[Qué debería pasar]

COMPORTAMIENTO ACTUAL:
[Qué pasó realmente]

PASOS PARA REPRODUCIR:
1. [paso 1]
2. [paso 2]
3. [paso 3]

DATOS USADOS:
[Datos exactos de la prueba]

NAVEGADOR: [Chrome 120 / Firefox 121 / etc]

EVIDENCIA:
[Captura de pantalla o log de consola]

IMPACTO:
[Descripción del impacto en el usuario]
```

---

## 🎓 CONCEPTOS CLAVE DEL SISTEMA

### Arquitectura de Filtrado

```
Usuario → filtersStore → URL → API → applyFilters() → Supabase → Resultados
```

- **filtersStore**: Mantiene estado de filtros (Nanostores)
- **URL**: Fuente de verdad (query params)
- **applyFilters()**: Función que traduce filtros a queries SQL
- **Supabase**: Base de datos con JSONB para atributos dinámicos

### Tipos de Filtros

1. **SELECT**: Selección única (Material, Color, Tamaño)
2. **CHECKBOX**: Selección múltiple con lógica OR (Características)
3. **RANGE**: Rango numérico (Altura, Peso, Precio)
4. **BOOLEAN**: Sí/No (¿Con ruedas?, ¿Plegable?)

### Flujo de Datos

```
SSR (Astro) → Hidratación (Preact) → Cliente (Store + Fetch) → SSR (Nuevos datos)
```

El sistema usa:
- SSR para primera carga (SEO)
- Hidratación para interactividad
- Client-side navigation para UX fluida

---

## 📊 MÉTRICAS DE ÉXITO

El sistema se considera **LISTO PARA PRODUCCIÓN** si:

| Categoría | Criterio | Meta |
|-----------|----------|------|
| **Funcionalidad** | Pruebas pasadas | ≥ 95% (122/128) |
| **Bugs Críticos** | Encontrados | 0 |
| **Bugs Altos** | Encontrados | ≤ 3 |
| **Performance** | Carga inicial | < 3 seg |
| **Performance** | Cambio filtros | < 1 seg |
| **Responsive** | Funciona en mobile | 100% |
| **Accesibilidad** | Navegación teclado | Completa |
| **Seguridad** | XSS Protection | ✅ Activa |

---

## 🛠️ HERRAMIENTAS RECOMENDADAS

### Para Testing Manual
- **Chrome DevTools** (F12): Inspeccionar, Network, Performance
- **Firefox Developer Tools**: Alternativa excelente
- **Responsive Design Mode**: Probar diferentes dispositivos
- **Lighthouse**: Auditoría de performance y accesibilidad

### Para Capturas y Reportes
- **Nimbus Screenshot**: Capturas de pantalla completas
- **Loom**: Grabar videos de bugs
- **Notion/Trello**: Organizar bugs y tasks

### Para Validación
- **WAVE**: Accesibilidad web
- **axe DevTools**: Testing de accesibilidad
- **Color Contrast Checker**: Verificar contraste

---

## 📝 PLANTILLA DE REPORTE FINAL

Al completar todas las partes:

```markdown
# REPORTE DE PRUEBAS - SISTEMA ARM

## Información General
- **Fecha**: [fecha inicio] - [fecha fin]
- **Ejecutado por**: [tu nombre]
- **Duración total**: [X horas]
- **Versión del sistema**: [commit hash o versión]

## Resumen Ejecutivo

### Estadísticas
- **Total de pruebas**: 128
- **✅ Exitosas**: ___ (___%)
- **❌ Fallidas**: ___ (___%)
- **⚠️ Con observaciones**: ___
- **⬜ Omitidas**: ___

### Distribución por Parte
| Parte | Total | Pasadas | Fallidas | % Éxito |
|-------|-------|---------|----------|---------|
| 1     | 16    | __      | __       | __%     |
| 2     | 20    | __      | __       | __%     |
| 3     | 16    | __      | __       | __%     |
| 4     | 22    | __      | __       | __%     |
| 5     | 25    | __      | __       | __%     |
| 6     | 29    | __      | __       | __%     |

## Bugs Encontrados

### 🔴 Críticos (Bloqueantes)
[Lista de bugs críticos con formato detallado]

### 🟠 Altos
[Lista]

### 🟡 Medios
[Lista]

### 🟢 Bajos
[Lista]

## Áreas Más Problemáticas
1. [Área con más bugs]
2. [Segunda área]
3. [Tercera área]

## Áreas Más Sólidas
1. [Área sin bugs o con menos bugs]
2. [Segunda área]

## Observaciones Generales
- [Observación 1]
- [Observación 2]

## Recomendaciones
1. **Inmediatas** (antes de producción):
   - [Recomendación crítica]
   
2. **Corto plazo** (1-2 semanas):
   - [Mejora importante]
   
3. **Largo plazo** (futuras versiones):
   - [Feature o mejora]

## Próximos Pasos
- [ ] Corregir todos los bugs críticos
- [ ] Re-testear bugs corregidos
- [ ] Implementar mejoras prioritarias
- [ ] Testing de regresión
- [ ] Testing de carga/stress
- [ ] Preparar para staging

## Conclusión
[Párrafo final con recomendación: ¿Listo para producción? ¿Qué falta?]

---
**Reporte generado por**: [Nombre]
**Fecha**: [Fecha]
```

---

## 🎯 CHECKLIST PRE-TESTING

Antes de empezar, verifica:

```markdown
ENTORNO
- [ ] Sistema corriendo en http://localhost:4321
- [ ] Base de datos funcionando
- [ ] Sin errores en consola al cargar
- [ ] Puedo acceder a /admin y /categorias

DATOS DE PRUEBA
- [ ] Tengo credenciales de admin
- [ ] Sé cómo crear categorías/subcategorías/productos
- [ ] Tengo imágenes de prueba listas
- [ ] Tengo PDFs de prueba para descargas

HERRAMIENTAS
- [ ] Navegador con DevTools
- [ ] Herramienta para capturas (si reporto bugs)
- [ ] Documento para anotar resultados

TIEMPO
- [ ] Tengo tiempo suficiente (mínimo 1 hora por parte)
- [ ] Puedo completar una parte completa sin interrupciones
```

---

## 💡 TIPS PARA TESTING EFECTIVO

### 1. Sigue el Orden
Las pruebas están diseñadas para ejecutarse en orden. No te saltes partes.

### 2. Usa Datos Consistentes
Los datos de prueba sugeridos están pensados para facilitar la verificación. Úsalos.

### 3. Anota TODO
Incluso si una prueba pasa, anota observaciones. Puede ser útil después.

### 4. No Asumas
Si algo no está claro, márcalo como "requiere verificación" y continúa.

### 5. Prueba los Extremos
Siempre prueba valores límite: 0, negativos, muy grandes, caracteres especiales.

### 6. Piensa como Usuario
No solo como tester. ¿Es intuitivo? ¿Es fácil de usar?

### 7. Reporta Inmediatamente
No acumules bugs. Repórtalos cuando los encuentres.

### 8. Re-testa después de Fix
Si un bug se corrige, vuelve a probar esa funcionalidad completa.

---

## 🤝 CONTRIBUIR A ESTA GUÍA

Si encuentras:
- Casos de prueba faltantes
- Mejoras a la redacción
- Errores en los pasos
- Nuevos edge cases

Por favor documéntalos y actualiza la guía.

---

## 📞 SOPORTE

Si tienes dudas sobre:
- Cómo ejecutar una prueba específica
- Qué comportamiento es el correcto
- Cómo reportar un bug complejo

Consulta con el equipo de desarrollo o abre un issue en el repositorio.

---

## 🎉 AGRADECIMIENTOS

Gracias por tomarte el tiempo de probar exhaustivamente este sistema. El testing manual sigue siendo insustituible para garantizar una experiencia de usuario de calidad.

**¡Buena suerte con las pruebas!** 🚀

---

## 📄 LICENCIA Y USO

Esta guía puede ser usada, modificada y distribuida libremente para proyectos similares. Se agradece atribución pero no es obligatoria.

---

**Guía creada por**: Ingeniero Senior con 30+ años de experiencia  
**Para**: Sistema ARM - Catálogo de Productos  
**Versión**: 1.0  
**Última actualización**: Diciembre 2025

---

## 🔗 ENLACES RÁPIDOS

- [Parte 1: Autenticación y Categorías](./GUIA_PRUEBAS_PARTE_1.md)
- [Parte 2: Subcategorías y Filtros](./GUIA_PRUEBAS_PARTE_2.md)
- [Parte 3: Catálogo Público](./GUIA_PRUEBAS_PARTE_3.md)
- [Parte 4: Filtros Dinámicos](./GUIA_PRUEBAS_PARTE_4.md)
- [Parte 5: Paginación y Ordenamiento](./GUIA_PRUEBAS_PARTE_5.md)
- [Parte 6: Detalle y Casos Finales](./GUIA_PRUEBAS_PARTE_6.md)

---

**¡ÉXITO EN TUS PRUEBAS!** ✨

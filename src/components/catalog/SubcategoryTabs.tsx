import type { Subcategory } from '@/lib/data/types';
import { setSubcategory } from '@/stores/filtersStore';
import styles from './SubcategoryTabs.module.css';

export interface SubcategoryTabsProps {
  subcategories: Subcategory[];
  currentSubcategorySlug: string | null;
}

export function SubcategoryTabs({
  subcategories,
  currentSubcategorySlug,
}: SubcategoryTabsProps) {

  const handleTabClick = (slug: string | null) => {
    setSubcategory(slug);
  };

  if (subcategories.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {/* Tab "Todos" */}
        <button
          className={`${styles.tab} ${currentSubcategorySlug === null ? styles.active : ''}`}
          onClick={() => handleTabClick(null)}
        >
          Todos
        </button>

        {/* Tabs de subcategorías */}
        {subcategories.map((subcategory) => (
          <button
            key={subcategory.id}
            className={`${styles.tab} ${
              currentSubcategorySlug === subcategory.slug ? styles.active : ''
            }`}
            onClick={() => handleTabClick(subcategory.slug)}
          >
            {subcategory.name}
          </button>
        ))}
      </div>
    </div>
  );
}

import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>Error al cargar productos</h2>
        <p className={styles.message}>{error}</p>
        <button className={styles.button} onClick={handleReload}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

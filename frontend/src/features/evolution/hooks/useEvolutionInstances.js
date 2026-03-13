import { useCallback, useEffect, useState } from "react";
import { fetchEvolutionInstances } from "../evolutionApi";

export function useEvolutionInstances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInstances = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await fetchEvolutionInstances();
      setInstances(Array.isArray(data?.instances) ? data.instances : []);
    } catch (err) {
      console.error("Erro ao carregar instâncias Evolution:", err);
      setError(err.message || "Erro ao carregar instâncias");
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  return {
    instances,
    loading,
    error,
    reloadInstances: loadInstances,
  };
}
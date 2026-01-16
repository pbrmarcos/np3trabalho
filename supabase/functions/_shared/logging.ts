// ============================================
// LOGGING PADRONIZADO PARA EDGE FUNCTIONS
// ============================================

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface Logger {
  (step: string, details?: unknown): void;
  info: (step: string, details?: unknown) => void;
  warn: (step: string, details?: unknown) => void;
  error: (step: string, details?: unknown) => void;
  debug: (step: string, details?: unknown) => void;
}

/**
 * Cria um logger padronizado para uma Edge Function
 * @param functionName - Nome da função (será usado como prefixo)
 */
export function createLogger(functionName: string): Logger {
  const formatDetails = (details?: unknown): string => {
    if (details === undefined || details === null) return "";
    
    try {
      if (typeof details === "string") return ` - ${details}`;
      return ` - ${JSON.stringify(details)}`;
    } catch {
      return ` - [unserializable]`;
    }
  };

  const log = (level: LogLevel, step: string, details?: unknown): void => {
    const timestamp = new Date().toISOString();
    const prefix = `[${functionName}]`;
    const detailsStr = formatDetails(details);
    
    const message = `${prefix} ${step}${detailsStr}`;
    
    switch (level) {
      case "ERROR":
        console.error(message);
        break;
      case "WARN":
        console.warn(message);
        break;
      case "DEBUG":
        // Only log debug in development (check for presence of DEBUG env var)
        if (Deno.env.get("DEBUG")) {
          console.log(`[DEBUG] ${message}`);
        }
        break;
      default:
        console.log(message);
    }
  };

  // Função principal (default INFO)
  const logger = ((step: string, details?: unknown) => {
    log("INFO", step, details);
  }) as Logger;

  // Métodos específicos
  logger.info = (step: string, details?: unknown) => log("INFO", step, details);
  logger.warn = (step: string, details?: unknown) => log("WARN", step, details);
  logger.error = (step: string, details?: unknown) => log("ERROR", step, details);
  logger.debug = (step: string, details?: unknown) => log("DEBUG", step, details);

  return logger;
}

/**
 * Formata erro para logging seguro (evita expor stack traces em produção)
 */
export function formatError(error: unknown): { message: string; type?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      type: error.name,
    };
  }
  
  if (typeof error === "string") {
    return { message: error };
  }
  
  return { message: "Erro desconhecido" };
}

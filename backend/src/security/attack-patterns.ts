/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ATTACK PATTERNS DATABASE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Bibliothèque de signatures d'attaques connues
 * utilisée par le moteur de détection heuristique.
 */

export type AttackCategory = 'SQL_INJECTION' | 'XSS' | 'PATH_TRAVERSAL' | 'COMMAND_INJECTION' | 'SCANNER' | 'BOT' | 'HONEYPOT';
export type AttackSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AttackPattern {
  id: string;
  category: AttackCategory;
  severity: AttackSeverity;
  pattern: RegExp;
  description: string;
  score: number;
}

// ── SQL Injection Patterns ──
export const SQL_INJECTION_PATTERNS: AttackPattern[] = [
  {
    id: 'SQLI_001',
    category: 'SQL_INJECTION',
    severity: 'CRITICAL',
    pattern: /(\b(union\s+(all\s+)?select|select\s+.*\s+from|insert\s+into|update\s+.*\s+set|delete\s+from|drop\s+(table|database)|alter\s+table)\b)/i,
    description: 'SQL statement keywords detected',
    score: 40,
  },
  {
    id: 'SQLI_002',
    category: 'SQL_INJECTION',
    severity: 'HIGH',
    pattern: /('(\s*)(or|and)(\s+)[\w']+=[\w']+|"\s*(or|and)\s+[\w"]+=[\w"]+)/i,
    description: 'OR/AND-based SQL injection attempt',
    score: 35,
  },
  {
    id: 'SQLI_003',
    category: 'SQL_INJECTION',
    severity: 'HIGH',
    pattern: /(;\s*(drop|alter|create|truncate|exec|execute|xp_)\s)/i,
    description: 'Chained SQL command injection',
    score: 40,
  },
  {
    id: 'SQLI_004',
    category: 'SQL_INJECTION',
    severity: 'MEDIUM',
    pattern: /(\/\*[\s\S]*?\*\/|--\s|#\s*$)/m,
    description: 'SQL comment injection attempt',
    score: 20,
  },
  {
    id: 'SQLI_005',
    category: 'SQL_INJECTION',
    severity: 'HIGH',
    pattern: /((%%27)|('))\s*((%%6F)|o|(%%4F))((%%72)|r|(%%52))/i,
    description: 'URL-encoded SQL injection',
    score: 35,
  },
];

// ── XSS Patterns ──
export const XSS_PATTERNS: AttackPattern[] = [
  {
    id: 'XSS_001',
    category: 'XSS',
    severity: 'HIGH',
    pattern: /(<script[\s>]|<\/script>|javascript\s*:|on(load|error|click|mouseover|focus|blur|submit|change|input)\s*=)/i,
    description: 'Script tag or event handler injection',
    score: 35,
  },
  {
    id: 'XSS_002',
    category: 'XSS',
    severity: 'HIGH',
    pattern: /(<img[^>]+src\s*=\s*["']?javascript:|<iframe|<object|<embed|<svg[^>]+onload)/i,
    description: 'HTML element-based XSS attempt',
    score: 35,
  },
  {
    id: 'XSS_003',
    category: 'XSS',
    severity: 'MEDIUM',
    pattern: /(document\.(cookie|location|write)|window\.(location|open)|eval\s*\(|alert\s*\(|prompt\s*\(|confirm\s*\()/i,
    description: 'JavaScript DOM manipulation attempt',
    score: 30,
  },
  {
    id: 'XSS_004',
    category: 'XSS',
    severity: 'MEDIUM',
    pattern: /(&#x?[0-9a-f]+;?|%%3C|%%3E|%%22|%%27|%%3D)/i,
    description: 'Encoded character XSS bypass attempt',
    score: 15,
  },
];

// ── Path Traversal Patterns ──
export const PATH_TRAVERSAL_PATTERNS: AttackPattern[] = [
  {
    id: 'PT_001',
    category: 'PATH_TRAVERSAL',
    severity: 'CRITICAL',
    pattern: /(\.\.\/|\.\.\\|%%2e%%2e%%2f|%%2e%%2e\/|\.\.%%2f|%%2e%%2e%%5c)/i,
    description: 'Directory traversal sequence detected',
    score: 40,
  },
  {
    id: 'PT_002',
    category: 'PATH_TRAVERSAL',
    severity: 'HIGH',
    pattern: /(\/etc\/(passwd|shadow|hosts)|\/proc\/self|\/var\/log|c:\\windows\\system32)/i,
    description: 'System file access attempt',
    score: 45,
  },
];

// ── Command Injection Patterns ──
export const COMMAND_INJECTION_PATTERNS: AttackPattern[] = [
  {
    id: 'CMD_001',
    category: 'COMMAND_INJECTION',
    severity: 'CRITICAL',
    pattern: /(;\s*(ls|cat|rm|wget|curl|bash|sh|chmod|chown|nc|netcat|python|perl|ruby|php)\s)/i,
    description: 'Shell command injection attempt',
    score: 45,
  },
  {
    id: 'CMD_002',
    category: 'COMMAND_INJECTION',
    severity: 'HIGH',
    pattern: /(\|\||&&|`[^`]+`|\$\([^)]+\)|\$\{[^}]+\})/,
    description: 'Command chaining or substitution',
    score: 30,
  },
];

// ── Malicious User-Agents & Scanner Signatures ──
export const SCANNER_USER_AGENTS: RegExp[] = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /dirbuster/i,
  /gobuster/i,
  /wpscan/i,
  /nuclei/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
  /burpsuite/i,
  /owasp\s*zap/i,
  /hydra/i,
  /metasploit/i,
  /havij/i,
  /w3af/i,
  /arachni/i,
  /skipfish/i,
  /whatweb/i,
];

// ── Bot User-Agent Heuristics ──
export const BOT_INDICATORS: RegExp[] = [
  /^$/,                         // User-Agent vide
  /^-$/,                        // User-Agent tiret
  /^Mozilla\/4\.0$/,            // UA tronqué suspect
  /python-requests/i,
  /python-urllib/i,
  /node-fetch/i,
  /axios/i,
  /go-http-client/i,
  /java\//i,
  /curl\//i,
  /wget\//i,
  /libwww-perl/i,
  /mechanize/i,
  /scrapy/i,
  /phantomjs/i,
  /headlesschrome/i,
];

// ── Agrégation de tous les patterns ──
export const ALL_ATTACK_PATTERNS: AttackPattern[] = [
  ...SQL_INJECTION_PATTERNS,
  ...XSS_PATTERNS,
  ...PATH_TRAVERSAL_PATTERNS,
  ...COMMAND_INJECTION_PATTERNS,
];

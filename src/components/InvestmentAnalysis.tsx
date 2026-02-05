import { TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { Property } from '@/types/database';

interface InvestmentAnalysisProps {
  property: Property;
}

function parseMonthsFromTime(time: string | null): number {
  if (!time) return 12;
  const match = time.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 12;
}

function getRiskScore(risks: string | null): number {
  if (!risks) return 60;
  const lower = risks.toLowerCase();
  if (lower.includes('baixo')) return 90;
  if (lower.includes('alto')) return 30;
  return 60; // médio
}

function calculateOpportunityScore(
  appreciation: number,
  months: number,
  riskScore: number
): number {
  // Normalize appreciation (cap at 100% for scoring purposes)
  const appreciationNormalized = Math.min(appreciation, 100);
  
  // Inverse of months (shorter = better, normalize to 0-100 scale)
  // 6 months = 100, 24 months = 25
  const timeScore = Math.max(25, 100 - ((months - 6) * 4.17));
  
  // Weighted score
  const score = (appreciationNormalized * 0.4) + (timeScore * 0.3) + (riskScore * 0.3);
  
  return Math.min(100, Math.max(0, score));
}

function getScoreLabel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 80) return { label: 'EXCELENTE', color: 'text-primary', bgColor: 'bg-primary' };
  if (score >= 60) return { label: 'BOM', color: 'text-primary', bgColor: 'bg-primary' };
  if (score >= 40) return { label: 'MODERADO', color: 'text-primary', bgColor: 'bg-primary' };
  return { label: 'RISCO ALTO', color: 'text-primary', bgColor: 'bg-primary' };
}

export function InvestmentAnalysis({ property }: InvestmentAnalysisProps) {
  const acquisitionCost = property.acquisition_cost || 0;
  const regularizationCost = property.regularization_cost || 0;
  const projectedValue = property.projected_value || 0;
  
  const totalInvestment = acquisitionCost + regularizationCost;
  const netReturn = projectedValue - totalInvestment;
  const roi = totalInvestment > 0 ? (netReturn / totalInvestment) * 100 : 0;
  
  const months = parseMonthsFromTime(property.regularization_time);
  const monthlyReturn = months > 0 ? roi / months : 0;
  
  const appreciation = totalInvestment > 0 ? ((projectedValue - totalInvestment) / totalInvestment) * 100 : 0;
  const riskScore = getRiskScore(property.risks);
  const opportunityScore = calculateOpportunityScore(appreciation, months, riskScore);
  const scoreInfo = getScoreLabel(opportunityScore);

  return (
    <div className="card-premium p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          Análise de Investimento
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="rounded-lg bg-secondary p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Investimento Total</p>
          </div>
          <p className="font-display text-xl font-bold text-foreground">
            {formatCurrency(totalInvestment)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (Aquisição + Regularização)
          </p>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">Retorno Líquido</p>
          </div>
          <p className="font-display text-xl font-bold text-primary">
            {formatCurrency(netReturn)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (Após regularização)
          </p>
        </div>

        <div className="rounded-lg bg-secondary p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">ROI Projetado</p>
          </div>
          <p className="font-display text-xl font-bold text-primary">
            {roi.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-lg bg-secondary p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Rentabilidade Mensal</p>
          </div>
          <p className="font-display text-xl font-bold text-foreground">
            ~{monthlyReturn.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Opportunity Indicator */}
      <div className="rounded-lg bg-secondary/50 p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Indicador de Oportunidade</h3>
        </div>
        
        <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden mb-2">
          <div 
            className={`absolute inset-y-0 left-0 ${scoreInfo.bgColor} transition-all duration-500`}
            style={{ width: `${opportunityScore}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`font-bold ${scoreInfo.color}`}>
            {opportunityScore.toFixed(0)}% {scoreInfo.label}
          </span>
          <span className="text-xs text-muted-foreground">
            Baseado em valorização, prazo e risco
          </span>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Download, CalendarIcon, Loader2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface ConsentLog {
  id: string;
  session_id: string | null;
  user_email: string | null;
  user_name: string | null;
  consent_type: string;
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  country: string | null;
  device_type: string | null;
  browser_name: string | null;
  os_name: string | null;
  pages_visited: number | null;
  time_on_site_seconds: number | null;
  created_at: string;
}

const CHART_COLORS = [
  { r: 59, g: 130, b: 246 },
  { r: 16, g: 185, b: 129 },
  { r: 245, g: 158, b: 11 },
  { r: 239, g: 68, b: 68 },
  { r: 139, g: 92, b: 246 },
  { r: 236, g: 72, b: 153 },
];

export function LGPDReportExporter() {
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] = useState<string>("7");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);

  const getDateRange = () => {
    if (periodType === "custom" && customStartDate && customEndDate) {
      return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
    }
    const days = parseInt(periodType);
    return { start: subDays(new Date(), days), end: new Date() };
  };

  const { data: logs, isLoading } = useQuery({
    queryKey: ["lgpd-report-logs", periodType, customStartDate, customEndDate],
    queryFn: async () => {
      const { start, end } = getDateRange();
      const { data, error } = await supabase
        .from("cookie_consent_logs")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ConsentLog[];
    },
    enabled: open,
  });

  const drawPieChart = (
    doc: jsPDF,
    centerX: number,
    centerY: number,
    radius: number,
    data: { label: string; value: number; color: { r: number; g: number; b: number } }[]
  ) => {
    const total = data.reduce((acc, d) => acc + d.value, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;
    
    data.forEach(item => {
      if (item.value === 0) return;
      
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      doc.setFillColor(item.color.r, item.color.g, item.color.b);
      
      const points: [number, number][] = [[centerX, centerY]];
      const segments = Math.max(Math.ceil(sliceAngle / 0.1), 10);
      
      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (sliceAngle * i) / segments;
        points.push([
          centerX + radius * Math.cos(angle),
          centerY + radius * Math.sin(angle)
        ]);
      }
      
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => doc.lineTo(x, y));
      doc.lineTo(points[0][0], points[0][1]);
      doc.fill();
      
      startAngle += sliceAngle;
    });
  };

  const drawBarChart = (
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    data: { label: string; value: number; color: { r: number; g: number; b: number } }[]
  ) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barWidth = (width - 8) / data.length - 4;
    const barGap = 4;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(x, y + height, x + width, y + height);
    
    data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * (height - 8);
      const barX = x + 4 + index * (barWidth + barGap);
      const barY = y + height - barHeight;
      
      doc.setFillColor(item.color.r, item.color.g, item.color.b);
      doc.rect(barX, barY, barWidth, barHeight, "F");
      
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text(item.value.toString(), barX + barWidth / 2, barY - 1, { align: "center" });
      
      doc.setFontSize(5);
      const label = item.label.length > 10 ? item.label.substring(0, 10) + ".." : item.label;
      doc.text(label, barX + barWidth / 2, y + height + 5, { align: "center" });
    });
  };

  const drawCompactLegend = (
    doc: jsPDF,
    x: number,
    y: number,
    data: { label: string; value: number; percentage: string; color: { r: number; g: number; b: number } }[]
  ) => {
    doc.setFontSize(6);
    let legendY = y;
    
    data.forEach(item => {
      doc.setFillColor(item.color.r, item.color.g, item.color.b);
      doc.rect(x, legendY - 2, 5, 5, "F");
      
      doc.setTextColor(60, 60, 60);
      doc.text(`${item.label}: ${item.value} (${item.percentage})`, x + 7, legendY + 1);
      legendY += 7;
    });
  };

  const generatePDF = async () => {
    if (!logs?.length) {
      toast({
        title: "Sem dados",
        description: "Não há registros para o período selecionado.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { start, end } = getDateRange();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;
      let currentPage = 1;

      const addFooter = () => {
        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${currentPage} - WebQ Sistema de Conformidade LGPD`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
      };

      const stats = logs.reduce(
        (acc, log) => {
          acc.total++;
          if (log.consent_type === "accept_all") acc.acceptAll++;
          if (log.consent_type === "accept_essential") acc.acceptEssential++;
          if (log.consent_type === "custom") acc.custom++;
          if (log.consent_type === "reset") acc.reset++;
          if (log.preferences) acc.withPreferences++;
          if (log.analytics) acc.withAnalytics++;
          if (log.marketing) acc.withMarketing++;
          return acc;
        },
        { total: 0, acceptAll: 0, acceptEssential: 0, custom: 0, reset: 0, withPreferences: 0, withAnalytics: 0, withMarketing: 0 }
      );

      const uniqueSessions = new Set(logs.map(l => l.session_id).filter(Boolean)).size;

      // ========== PAGE 1 ==========
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 28, "F");
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Relatório de Conformidade LGPD", pageWidth / 2, 14, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Período: ${format(start, "dd/MM/yyyy")} a ${format(end, "dd/MM/yyyy")} | Gerado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, 23, { align: "center" });

      yPos = 38;

      // Summary cards - 4 in a row
      const cardWidth = (pageWidth - 2 * margin - 9) / 4;
      const cardHeight = 22;
      
      const acceptRate = stats.total > 0 ? Math.round((stats.acceptAll / stats.total) * 100) : 0;
      const summaryCards = [
        { value: stats.total.toString(), label: "Total", bg: [239, 246, 255], color: [59, 130, 246] },
        { value: uniqueSessions.toString(), label: "Únicos", bg: [240, 253, 244], color: [16, 185, 129] },
        { value: `${acceptRate}%`, label: "Aceitaram Todos", bg: [254, 243, 199], color: [245, 158, 11] },
        { value: stats.reset.toString(), label: "Redefinições", bg: [254, 242, 242], color: [239, 68, 68] },
      ];

      summaryCards.forEach((card, i) => {
        const cardX = margin + i * (cardWidth + 3);
        doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
        doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, "F");
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(card.color[0], card.color[1], card.color[2]);
        doc.text(card.value, cardX + cardWidth / 2, yPos + 11, { align: "center" });
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(card.label, cardX + cardWidth / 2, yPos + 18, { align: "center" });
      });

      yPos += cardHeight + 10;

      // Row 1: Consent Type Pie + Category Bar
      const chartWidth = (pageWidth - 2 * margin - 10) / 2;
      
      // Consent Type Section
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Tipo de Consentimento", margin, yPos);

      const consentData = [
        { label: "Aceitar Todos", value: stats.acceptAll, color: CHART_COLORS[1], percentage: `${stats.total > 0 ? Math.round((stats.acceptAll / stats.total) * 100) : 0}%` },
        { label: "Essenciais", value: stats.acceptEssential, color: CHART_COLORS[0], percentage: `${stats.total > 0 ? Math.round((stats.acceptEssential / stats.total) * 100) : 0}%` },
        { label: "Personalizado", value: stats.custom, color: CHART_COLORS[2], percentage: `${stats.total > 0 ? Math.round((stats.custom / stats.total) * 100) : 0}%` },
        { label: "Redefinido", value: stats.reset, color: CHART_COLORS[4], percentage: `${stats.total > 0 ? Math.round((stats.reset / stats.total) * 100) : 0}%` },
      ].filter(d => d.value > 0);

      if (consentData.length > 0) {
        drawPieChart(doc, margin + 22, yPos + 28, 18, consentData);
        drawCompactLegend(doc, margin + 48, yPos + 10, consentData);
      }

      // Category Rates Section
      doc.text("Taxa por Categoria (%)", margin + chartWidth + 10, yPos);
      
      const categoryData = [
        { label: "Essenciais", value: 100, color: CHART_COLORS[0] },
        { label: "Preferências", value: stats.total > 0 ? Math.round((stats.withPreferences / stats.total) * 100) : 0, color: CHART_COLORS[1] },
        { label: "Análise", value: stats.total > 0 ? Math.round((stats.withAnalytics / stats.total) * 100) : 0, color: CHART_COLORS[2] },
        { label: "Marketing", value: stats.total > 0 ? Math.round((stats.withMarketing / stats.total) * 100) : 0, color: CHART_COLORS[3] },
      ];

      drawBarChart(doc, margin + chartWidth + 10, yPos + 5, chartWidth, 40, categoryData);

      yPos += 55;

      // Row 2: Geographic Pie + Device Pie
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Distribuição Geográfica", margin, yPos);

      const countryStats: Record<string, number> = {};
      logs.forEach(log => {
        const country = log.country || "N/I";
        countryStats[country] = (countryStats[country] || 0) + 1;
      });
      
      const topCountries = Object.entries(countryStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, count], i) => ({
          label: country.length > 12 ? country.substring(0, 12) + ".." : country,
          value: count,
          color: CHART_COLORS[i % CHART_COLORS.length],
          percentage: `${Math.round((count / stats.total) * 100)}%`
        }));

      if (topCountries.length > 0) {
        drawPieChart(doc, margin + 22, yPos + 25, 16, topCountries);
        drawCompactLegend(doc, margin + 45, yPos + 8, topCountries);
      }

      // Device Distribution
      doc.text("Dispositivos", margin + chartWidth + 10, yPos);

      const deviceStats: Record<string, number> = {};
      logs.forEach(log => {
        const device = log.device_type || "desktop";
        const deviceName = device.charAt(0).toUpperCase() + device.slice(1);
        deviceStats[deviceName] = (deviceStats[deviceName] || 0) + 1;
      });

      const deviceData = Object.entries(deviceStats)
        .map(([device, count], i) => ({
          label: device,
          value: count,
          color: CHART_COLORS[i % CHART_COLORS.length],
          percentage: `${Math.round((count / stats.total) * 100)}%`
        }));

      if (deviceData.length > 0) {
        drawPieChart(doc, margin + chartWidth + 32, yPos + 25, 16, deviceData);
        drawCompactLegend(doc, margin + chartWidth + 55, yPos + 8, deviceData);
      }

      yPos += 50;

      // Row 3: Browser Bar
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Navegadores", margin, yPos);

      const browserStats: Record<string, number> = {};
      logs.forEach(log => {
        const browser = log.browser_name || "Outro";
        browserStats[browser] = (browserStats[browser] || 0) + 1;
      });

      const browserData = Object.entries(browserStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([browser, count], i) => ({
          label: browser,
          value: count,
          color: CHART_COLORS[i % CHART_COLORS.length]
        }));

      if (browserData.length > 0) {
        drawBarChart(doc, margin, yPos + 5, pageWidth - 2 * margin, 32, browserData);
      }

      yPos += 48;

      // Engagement metrics - compact row
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Métricas de Engajamento", margin, yPos);
      yPos += 6;

      const validTimeLogs = logs.filter(l => l.time_on_site_seconds && l.time_on_site_seconds > 0);
      const validPageLogs = logs.filter(l => l.pages_visited && l.pages_visited > 0);
      const avgTime = validTimeLogs.length > 0
        ? Math.round(validTimeLogs.reduce((acc, l) => acc + (l.time_on_site_seconds || 0), 0) / validTimeLogs.length)
        : 0;
      const avgPages = validPageLogs.length > 0
        ? (validPageLogs.reduce((acc, l) => acc + (l.pages_visited || 0), 0) / validPageLogs.length).toFixed(1)
        : "0";
      const totalPages = validPageLogs.reduce((acc, l) => acc + (l.pages_visited || 0), 0);

      const formatTime = (secs: number) => {
        if (secs < 60) return `${secs}s`;
        return `${Math.floor(secs / 60)}m ${secs % 60}s`;
      };

      const metricWidth = (pageWidth - 2 * margin - 6) / 3;
      const metricHeight = 16;

      const metrics = [
        { label: "Tempo Médio", value: formatTime(avgTime), bg: [240, 249, 255], color: [59, 130, 246] },
        { label: "Págs/Visita", value: avgPages, bg: [240, 253, 244], color: [16, 185, 129] },
        { label: "Total Páginas", value: totalPages.toString(), bg: [254, 243, 199], color: [245, 158, 11] },
      ];

      metrics.forEach((m, i) => {
        const mx = margin + i * (metricWidth + 3);
        doc.setFillColor(m.bg[0], m.bg[1], m.bg[2]);
        doc.roundedRect(mx, yPos, metricWidth, metricHeight, 2, 2, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(m.color[0], m.color[1], m.color[2]);
        doc.text(m.value, mx + metricWidth / 2, yPos + 7, { align: "center" });
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(m.label, mx + metricWidth / 2, yPos + 13, { align: "center" });
      });

      yPos += metricHeight + 8;

      // Compliance section - compact
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 32, 2, 2, "F");
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Declaração de Conformidade LGPD", margin + 5, yPos + 7);
      
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("• Preferências registradas com data/hora • Auditoria completa disponível • Revogação a qualquer momento • Direito ao Esquecimento ativo", margin + 5, yPos + 15);
      doc.text(`Relatório válido: ${format(start, "dd/MM/yyyy")} a ${format(end, "dd/MM/yyyy")} | Gerado automaticamente pelo sistema WebQ`, margin + 5, yPos + 23);

      addFooter();

      // ========== PAGE 2: DETAILED TABLE ==========
      doc.addPage();
      currentPage++;
      yPos = margin;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Registros Detalhados de Consentimento", margin, yPos);
      yPos += 8;

      // Table header
      const colWidths = [28, 38, 22, 20, 20, 20, 32];
      const headers = ["Data/Hora", "Email/Sessão", "Tipo", "Pref", "Anál", "Mkt", "País/Disp"];
      
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
      
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      
      let colX = margin + 2;
      headers.forEach((h, i) => {
        doc.text(h, colX, yPos + 5);
        colX += colWidths[i];
      });
      
      yPos += 8;

      // Table rows
      const maxRows = Math.min(logs.length, 40);
      const rowHeight = 6;
      
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");

      for (let i = 0; i < maxRows; i++) {
        const log = logs[i];
        const isEven = i % 2 === 0;
        
        if (isEven) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight, "F");
        }

        doc.setTextColor(60, 60, 60);
        colX = margin + 2;

        // Date
        doc.text(format(new Date(log.created_at), "dd/MM/yy HH:mm"), colX, yPos + 4);
        colX += colWidths[0];

        // Email/Session
        const identifier = log.user_email || log.session_id?.substring(0, 12) || "—";
        doc.text(identifier.length > 18 ? identifier.substring(0, 18) + ".." : identifier, colX, yPos + 4);
        colX += colWidths[1];

        // Type
        const typeMap: Record<string, string> = {
          accept_all: "Todos",
          accept_essential: "Essenc.",
          custom: "Person.",
          reset: "Reset"
        };
        doc.text(typeMap[log.consent_type] || log.consent_type, colX, yPos + 4);
        colX += colWidths[2];

        // Preferences
        doc.setTextColor(log.preferences ? 16 : 200, log.preferences ? 185 : 200, log.preferences ? 129 : 200);
        doc.text(log.preferences ? "Sim" : "Não", colX, yPos + 4);
        colX += colWidths[3];

        // Analytics
        doc.setTextColor(log.analytics ? 16 : 200, log.analytics ? 185 : 200, log.analytics ? 129 : 200);
        doc.text(log.analytics ? "Sim" : "Não", colX, yPos + 4);
        colX += colWidths[4];

        // Marketing
        doc.setTextColor(log.marketing ? 16 : 200, log.marketing ? 185 : 200, log.marketing ? 129 : 200);
        doc.text(log.marketing ? "Sim" : "Não", colX, yPos + 4);
        colX += colWidths[5];

        // Country/Device
        doc.setTextColor(60, 60, 60);
        const location = `${(log.country || "—").substring(0, 8)} / ${(log.device_type || "—").substring(0, 6)}`;
        doc.text(location, colX, yPos + 4);

        yPos += rowHeight;

        // Check for page break
        if (yPos > pageHeight - 25 && i < maxRows - 1) {
          addFooter();
          doc.addPage();
          currentPage++;
          yPos = margin;

          // Redraw header
          doc.setFillColor(59, 130, 246);
          doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
          
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          
          colX = margin + 2;
          headers.forEach((h, j) => {
            doc.text(h, colX, yPos + 5);
            colX += colWidths[j];
          });
          
          yPos += 8;
          doc.setFontSize(5);
          doc.setFont("helvetica", "normal");
        }
      }

      // Summary at end
      yPos += 5;
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Exibindo ${maxRows} de ${logs.length} registros | Para listagem completa, exporte via painel administrativo`, margin, yPos);

      addFooter();

      doc.save(`relatorio-lgpd-${format(start, "yyyyMMdd")}-${format(end, "yyyyMMdd")}.pdf`);

      toast({
        title: "Relatório gerado",
        description: "O PDF foi baixado com sucesso.",
      });

      setOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Relatório LGPD
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Relatório de Conformidade LGPD
          </DialogTitle>
          <DialogDescription>
            Gere um relatório PDF detalhado para auditoria de consentimento de cookies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Período do Relatório</Label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 6 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="custom">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {logs && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground">
                <strong>{logs.length}</strong> registros encontrados no período selecionado
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={generatePDF} 
            className="flex-1"
            disabled={isGenerating || isLoading || !logs?.length}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

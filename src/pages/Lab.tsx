import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlaskConical, Plus, Search, Filter, Settings, Play, BarChart3, FileText, Database, Clock, AlertTriangle, Zap, Activity, Download, Eye, MoreHorizontal, Brain, MessageSquare, Upload, Mail, Shield, ChevronDown, ChevronRight, Workflow, Code, Bot, TestTube, Users, Gauge, BookOpen, Star, TrendingUp, AlertCircle, CheckCircle2, XCircle, CalendarDays, Globe, Slack, Github, RotateCcw, Maximize2, ZoomIn, ZoomOut, Terminal, Bug, MapPin, Layers, Share2, Palette, Network, Sparkles, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/PageHeader";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DatasetManager, Dataset } from "@/modules/laboratory2/data/components/DatasetManager";
import { DatasetService } from "@/modules/laboratory2/data/services/dataset.service";
import { LabAgentsStudio } from "@/components/lab/LabAgentsStudio";
export default function Lab() {
  const {
    t
  } = useLanguage();
  const {
    isDeveloperMode
  } = useDeveloperMode();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("datasets");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // Require developer mode to access Lab
  useEffect(() => {
    if (!isDeveloperMode) {
      navigate('/dashboard');
    }
  }, [isDeveloperMode, navigate]);

  const handleSelectDataset = (dataset: Dataset) => {
    setSelectedDataset(dataset);
  };

  const handleAddDataset = () => {
    const newDataset: Dataset = {
      id: `dataset-${Date.now()}`,
      name: "New Dataset",
      source: "csv",
      rows: 0,
      columns: 0,
      owner: "User",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    DatasetService.save(newDataset);
    setDatasets([...datasets, newDataset]);
  };

  // Initialize datasets on mount
  useEffect(() => {
    const storedDatasets = DatasetService.getAll();
    
    // Check if we have example datasets or need to initialize
    const hasExampleDatasets = storedDatasets.some(ds => 
      ds.id === "dataset-1" || ds.id === "dataset-2" || ds.id === "dataset-3" || ds.id === "dataset-4"
    );
    
    if (storedDatasets.length === 0 || !hasExampleDatasets) {
      const exampleDatasets: Dataset[] = [
        {
          id: "dataset-1",
          name: "Продажи 2024",
          source: "csv",
          rows: 50000,
          columns: 15,
          owner: "Аналитик",
          status: "active",
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-15"),
        },
        {
          id: "dataset-2",
          name: "Клиентская база",
          source: "postgresql",
          rows: 120000,
          columns: 20,
          owner: "ML Team",
          status: "active",
          createdAt: new Date("2024-01-08"),
          updatedAt: new Date("2024-01-14"),
        },
        {
          id: "dataset-3",
          name: "Веб-логи",
          source: "json",
          rows: 1500000,
          columns: 8,
          owner: "DevOps",
          status: "processing",
          createdAt: new Date("2024-01-12"),
          updatedAt: new Date("2024-01-13"),
        },
        {
          id: "dataset-4",
          name: "Отзывы клиентов",
          source: "text",
          rows: 25000,
          columns: 3,
          owner: "Маркетинг",
          status: "active",
          createdAt: new Date("2024-01-05"),
          updatedAt: new Date("2024-01-12"),
        },
      ];
      
      // Save example datasets
      exampleDatasets.forEach(ds => DatasetService.save(ds));
      
      // Merge with existing datasets (excluding old "New Dataset" entries)
      const existingValidDatasets = storedDatasets.filter(ds => 
        ds.id !== "dataset-1" && ds.id !== "dataset-2" && ds.id !== "dataset-3" && ds.id !== "dataset-4" &&
        !(ds.name === "New Dataset" && ds.rows === 0)
      );
      
      setDatasets([...exampleDatasets, ...existingValidDatasets]);
    } else {
      // Filter out "New Dataset" entries with 0 rows
      const validDatasets = storedDatasets.filter(ds => 
        !(ds.name === "New Dataset" && ds.rows === 0)
      );
      setDatasets(validDatasets.length > 0 ? validDatasets : storedDatasets);
    }
  }, []);
  return <div className="flex flex-col h-full">
      <PageHeader title={t('lab.title')} subtitle={t('lab.subtitle')} />

      {/* Main Content */}
      <main className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="max-w-7xl mx-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="datasets">Датасеты</TabsTrigger>
              <TabsTrigger value="agents">Agents-Studio</TabsTrigger>
              <TabsTrigger value="data">ML-Studio</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="datasets" className="mt-6 max-w-7xl mx-auto">
              <DatasetManager 
                datasets={datasets}
                onSelectDataset={handleSelectDataset}
                onAddDataset={handleAddDataset}
              />
            </TabsContent>

            <TabsContent value="agents" className="mt-4">
              <LabAgentsStudio selectedDataset={selectedDataset} />
            </TabsContent>

            <TabsContent value="data" className="mt-6 max-w-7xl mx-auto">
              <div className="space-y-6">
                {/* Monitoring Section for ML */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Мониторинг моделей</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                         <div className="flex items-center gap-2">
                           <Brain className="h-5 w-5 text-primary" />
                           <span className="font-medium">Активные модели</span>
                         </div>
                        <div className="text-2xl font-bold mt-2">5</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                         <div className="flex items-center gap-2">
                           <BarChart3 className="h-5 w-5 text-primary" />
                           <span className="font-medium">Средний AUC</span>
                         </div>
                        <div className="text-2xl font-bold mt-2">0.89</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          <span className="font-medium">Прирост точности</span>
                        </div>
                        <div className="text-2xl font-bold mt-2">+12%</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                         <div className="flex items-center gap-2">
                           <Activity className="h-5 w-5 text-primary" />
                           <span className="font-medium">Предикшены/день</span>
                         </div>
                        <div className="text-2xl font-bold mt-2">2.4K</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Данные и AutoML</h3>
                    <p className="text-muted-foreground">Управление данными, трансформация и автоматическое машинное обучение</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Загрузить файл
                    </Button>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Подключить источник
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="datasets" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="datasets">Датасеты</TabsTrigger>
                    <TabsTrigger value="transformation">Трансформация</TabsTrigger>
                    <TabsTrigger value="automl">AutoML</TabsTrigger>
                    <TabsTrigger value="models">Модели</TabsTrigger>
                  </TabsList>

                  <TabsContent value="datasets" className="mt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative flex-1">
                        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input placeholder="Поиск датасетов..." className="pl-9" />
                      </div>
                      <Button variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        Фильтр
                      </Button>
                      <Button variant="outline">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Аналитика
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {[{
                      name: "Продажи 2024",
                      type: "CSV",
                      rows: "50,000",
                      owner: "Аналитик",
                      updated: "15/01/2024",
                      status: "Активен",
                      color: "blue"
                    }, {
                      name: "Клиентская база",
                      type: "PostgreSQL",
                      rows: "120,000",
                      owner: "ML Team",
                      updated: "14/01/2024",
                      status: "Активен",
                      color: "green"
                    }, {
                      name: "Веб-логи",
                      type: "JSON",
                      rows: "1,500,000",
                      owner: "DevOps",
                      updated: "13/01/2024",
                      status: "Обработка",
                      color: "orange"
                    }, {
                      name: "Отзывы клиентов",
                      type: "Text",
                      rows: "25,000",
                      owner: "Маркетинг",
                      updated: "12/01/2024",
                      status: "Активен",
                      color: "purple"
                    }].map((dataset, index) => <Card key={index} className="transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                 <Database className="h-5 w-5 text-primary" />
                               </div>
                                <div>
                                  <h4 className="font-medium">{dataset.name}</h4>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>Тип: {dataset.type}</span>
                                    <span>Строк: {dataset.rows}</span>
                                    <span>Владелец: {dataset.owner}</span>
                                    <span>Обновлен: {dataset.updated}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={dataset.status === "Активен" ? "secondary" : "outline"}>
                                  {dataset.status}
                                </Badge>
                                <Button variant="ghost" size="sm" title="Профилирование">
                                  <BarChart3 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" title="Просмотр">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" title="Настройки">
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" title="Скачать">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>)}
                    </div>
                  </TabsContent>

                  <TabsContent value="transformation" className="mt-4">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold">Конструктор трансформаций</h4>
                          <p className="text-muted-foreground">Визуальное создание пайплайнов обработки данных</p>
                        </div>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Новый рецепт
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Transform Builder */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Workflow className="h-5 w-5" />
                              Шаги трансформации
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {[{
                              icon: Filter,
                              name: "Фильтр",
                              desc: "Строки где age > 25"
                            }, {
                              icon: Layers,
                              name: "Группировка",
                              desc: "По городам"
                            }, {
                              icon: BarChart3,
                              name: "Агрегация",
                              desc: "Среднее значение дохода"
                            }].map((step, index) => <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                                  <step.icon className="h-4 w-4 text-primary" />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{step.name}</div>
                                    <div className="text-xs text-muted-foreground">{step.desc}</div>
                                  </div>
                                  <Button variant="ghost" size="sm">
                                    <Settings className="h-3 w-3" />
                                  </Button>
                                </div>)}
                              <Button variant="outline" className="w-full">
                                <Plus className="h-4 w-4 mr-2" />
                                Добавить шаг
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Preview */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Eye className="h-5 w-5" />
                              Предпросмотр результата
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="text-sm text-muted-foreground">Первые 10 строк после трансформации:</div>
                              <div className="border rounded overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted">
                                    <tr>
                                      <th className="p-2 text-left">Город</th>
                                      <th className="p-2 text-left">Средний доход</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-t">
                                      <td className="p-2">Алматы</td>
                                      <td className="p-2">₸450,000</td>
                                    </tr>
                                    <tr className="border-t">
                                      <td className="p-2">Астана</td>
                                      <td className="p-2">₸520,000</td>
                                    </tr>
                                    <tr className="border-t">
                                      <td className="p-2">Шымкент</td>
                                      <td className="p-2">₸380,000</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Экспорт
                                </Button>
                                <Button size="sm">
                                  <Play className="h-4 w-4 mr-2" />
                                  Применить
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="automl" className="mt-4">
                    <div className="space-y-6">
                      {/* AutoML Model Types */}
                      <div>
                        <h4 className="text-lg font-semibold mb-4">Типы моделей AutoML</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <Card>
                             <CardHeader>
                               <CardTitle className="flex items-center gap-2">
                                 <BarChart3 className="h-5 w-5 text-primary" />
                                 Классификация
                               </CardTitle>
                               <CardDescription>Создание моделей для категоризации данных</CardDescription>
                             </CardHeader>
                             <CardContent>
                               <Button className="w-full bg-primary">
                                 Создать модель
                               </Button>
                             </CardContent>
                           </Card>

                           <Card>
                             <CardHeader>
                               <CardTitle className="flex items-center gap-2">
                                 <TrendingUp className="h-5 w-5 text-primary" />
                                 Регрессия
                               </CardTitle>
                               <CardDescription>Прогнозирование числовых значений</CardDescription>
                             </CardHeader>
                             <CardContent>
                               <Button className="w-full bg-primary">
                                 Создать модель
                               </Button>
                             </CardContent>
                           </Card>

                           <Card>
                             <CardHeader>
                               <CardTitle className="flex items-center gap-2">
                                 <Clock className="h-5 w-5 text-primary" />
                                 Временные ряды
                               </CardTitle>
                               <CardDescription>Анализ и прогнозирование трендов</CardDescription>
                             </CardHeader>
                             <CardContent>
                               <Button className="w-full bg-primary">
                                 Создать модель
                               </Button>
                             </CardContent>
                           </Card>

                           <Card>
                             <CardHeader>
                               <CardTitle className="flex items-center gap-2">
                                 <Network className="h-5 w-5 text-primary" />
                                 Кластеризация
                               </CardTitle>
                               <CardDescription>Группировка данных по схожести</CardDescription>
                             </CardHeader>
                             <CardContent>
                               <Button className="w-full bg-primary">
                                 Создать модель
                               </Button>
                             </CardContent>
                           </Card>

                          
                        </div>
                      </div>

                      {/* AutoML Master */}
                      <div>
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5" />
                              Мастер AutoML
                            </CardTitle>
                            <CardDescription>Пошаговое создание модели машинного обучения</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Датасет</label>
                                <Button variant="outline" className="w-full justify-between">
                                  Выберите датасет
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">Целевая переменная</label>
                                <Button variant="outline" className="w-full justify-between">
                                  Выберите колонку
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <Button className="w-full bg-primary">
                              <Play className="h-4 w-4 mr-2" />
                              Запустить AutoML
                            </Button>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Templates */}
                      <div>
                        
                        
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="models" className="mt-4">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold">Реестр моделей</h4>
                          <p className="text-muted-foreground">Управление обученными моделями и их развертывание</p>
                        </div>
                        <Button variant="outline">
                          <Filter className="h-4 w-4 mr-2" />
                          Фильтр по статусу
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {[{
                        name: "Sales Forecast v1.2",
                        type: "Регрессия",
                        accuracy: "92.5%",
                        status: "Продакшн",
                        updated: "14/01/2024",
                        color: "green"
                      }, {
                        name: "Customer Churn v2.1",
                        type: "Классификация",
                        accuracy: "87.2%",
                        status: "Тестирование",
                        updated: "13/01/2024",
                        color: "blue"
                      }, {
                        name: "Anomaly Detection v1.0",
                        type: "Аномалии",
                        accuracy: "94.1%",
                        status: "Разработка",
                        updated: "12/01/2024",
                        color: "orange"
                      }].map((model, index) => <Card key={index} className="">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                 <Brain className="h-5 w-5 text-primary" />
                               </div>
                                  <div>
                                    <h4 className="font-medium">{model.name}</h4>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <span>Тип: {model.type}</span>
                                      <span>Точность: {model.accuracy}</span>
                                      <span>Обновлено: {model.updated}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={model.status === "Продакшн" ? "secondary" : "outline"}>
                                    {model.status}
                                  </Badge>
                                  <Button variant="ghost" size="sm" title="Тестировать">
                                    <TestTube className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" title="API">
                                    <Code className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" title="Развернуть">
                                    <Play className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" title="Настройки">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>)}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
          </Tabs>
      </main>
    </div>;
}
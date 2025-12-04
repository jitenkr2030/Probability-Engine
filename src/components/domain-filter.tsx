'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Search, Filter, Grid3X3, List } from 'lucide-react'

interface DomainCategory {
  id: string
  name: string
  description: string
  domains: string[]
  icon: React.ReactNode
  color: string
}

interface DomainFilterProps {
  selectedDomains: string[]
  onDomainChange: (domains: string[]) => void
  onCategoryChange: (categories: string[]) => void
}

const domainCategories: DomainCategory[] = [
  {
    id: 'core',
    name: 'Core Domains',
    description: 'Original prediction domains with established use cases',
    domains: ['financial', 'weather', 'traffic', 'energy'],
    icon: <Grid3X3 className="h-5 w-5" />,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'industrial',
    name: 'Industrial & Infrastructure',
    description: 'Manufacturing, energy, and utility prediction domains',
    domains: ['energy_utilities', 'manufacturing', 'telecom', 'automotive'],
    icon: <Grid3X3 className="h-5 w-5" />,
    color: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'business',
    name: 'Business & Commerce',
    description: 'Retail, HR, and business-focused prediction domains',
    domains: ['retail', 'hr', 'insurance'],
    icon: <Grid3X3 className="h-5 w-5" />,
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle & Consumer',
    description: 'Healthcare, agriculture, and consumer-focused domains',
    domains: ['healthcare', 'agriculture', 'sports'],
    icon: <Grid3X3 className="h-5 w-5" />,
    color: 'bg-purple-100 text-purple-800'
  }
]

const domainInfo = {
  financial: { name: 'Financial Markets', description: 'Market predictions and trading analysis' },
  weather: { name: 'Weather', description: 'Meteorological forecasting and climate prediction' },
  traffic: { name: 'Traffic', description: 'Congestion prediction and route optimization' },
  energy: { name: 'Energy Grid', description: 'Power load and grid management' },
  healthcare: { name: 'Healthcare', description: 'Patient risk and medical outcome prediction' },
  energy_utilities: { name: 'Energy Utilities', description: 'Utility grid and infrastructure management' },
  manufacturing: { name: 'Manufacturing', description: 'Equipment failure and quality prediction' },
  retail: { name: 'Retail & E-Commerce', description: 'Demand forecasting and customer behavior' },
  agriculture: { name: 'Agriculture', description: 'Crop yield and farming optimization' },
  hr: { name: 'HR & Workforce', description: 'Employee behavior and workforce analytics' },
  telecom: { name: 'Telecommunications', description: 'Network reliability and service quality' },
  sports: { name: 'Sports & Gaming', description: 'Game outcomes and performance prediction' },
  insurance: { name: 'Insurance', description: 'Risk assessment and claim prediction' },
  automotive: { name: 'Automotive & Mobility', description: 'Vehicle safety and mobility prediction' }
}

export function DomainFilter({ selectedDomains, onDomainChange, onCategoryChange }: DomainFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['core'])
  const [viewMode, setViewMode] = useState<'categories' | 'list'>('categories')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleDomain = (domain: string) => {
    onDomainChange(
      selectedDomains.includes(domain)
        ? selectedDomains.filter(d => d !== domain)
        : [...selectedDomains, domain]
    )
  }

  const toggleCategorySelection = (categoryId: string) => {
    const category = domainCategories.find(c => c.id === categoryId)
    if (!category) return

    const newSelectedCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId]

    setSelectedCategories(newSelectedCategories)
    onCategoryChange(newSelectedCategories)

    // Auto-select/deselect all domains in the category
    const categoryDomains = category.domains
    const updatedDomains = selectedDomains.filter(d => !categoryDomains.includes(d))
    
    if (newSelectedCategories.includes(categoryId)) {
      onDomainChange([...updatedDomains, ...categoryDomains])
    } else {
      onDomainChange(updatedDomains)
    }
  }

  const selectAllDomains = () => {
    const allDomains = Object.keys(domainInfo)
    onDomainChange(allDomains)
    setSelectedCategories(domainCategories.map(c => c.id))
    onCategoryChange(domainCategories.map(c => c.id))
  }

  const clearAllDomains = () => {
    onDomainChange([])
    setSelectedCategories([])
    onCategoryChange([])
  }

  const filteredCategories = domainCategories.map(category => ({
    ...category,
    domains: category.domains.filter(domain =>
      domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      domainInfo[domain as keyof typeof domainInfo].name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.domains.length > 0)

  const totalSelected = selectedDomains.length
  const totalAvailable = Object.keys(domainInfo).length

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Domain Filter
            </CardTitle>
            <CardDescription>
              Select prediction domains and categories ({totalSelected} of {totalAvailable} selected)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'categories' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('categories')}
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Categories
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search domains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllDomains}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearAllDomains}>
              Clear All
            </Button>
          </div>
        </div>

        {/* Category View */}
        {viewMode === 'categories' && (
          <div className="space-y-3">
            {filteredCategories.map((category) => (
              <Collapsible
                key={category.id}
                open={expandedCategories.includes(category.id)}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => toggleCategorySelection(category.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={`p-2 rounded-lg ${category.color}`}>
                        {category.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {category.domains.filter(d => selectedDomains.includes(d)).length}/{category.domains.length}
                      </Badge>
                      {expandedCategories.includes(category.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 ml-12 space-y-2">
                  {category.domains.map((domain) => (
                    <div key={domain} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={selectedDomains.includes(domain)}
                        onCheckedChange={() => toggleDomain(domain)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {domainInfo[domain as keyof typeof domainInfo].name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {domainInfo[domain as keyof typeof domainInfo].description}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {domain}
                      </Badge>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(domainInfo)
              .filter(([domain]) => 
                domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                domainInfo[domain as keyof typeof domainInfo].name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(([domain, info]) => (
                <div key={domain} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    checked={selectedDomains.includes(domain)}
                    onCheckedChange={() => toggleDomain(domain)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1">{info.name}</div>
                    <div className="text-xs text-muted-foreground mb-2">{info.description}</div>
                    <Badge variant="outline" className="text-xs">
                      {domain}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Selected Domains Summary */}
        {totalSelected > 0 && (
          <div className="border-t pt-4">
            <div className="flex flex-wrap gap-2">
              {selectedDomains.map((domain) => (
                <Badge key={domain} variant="secondary" className="text-xs">
                  {domainInfo[domain as keyof typeof domainInfo].name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
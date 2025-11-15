/**
 * WorkflowPrompt Component
 *
 * Dynamic form for workflow input parameters
 */

'use client'

import { useState } from 'react'
import { Workflow } from '@/lib/dtos'
import { Input, Textarea, Select, Button } from '@/components/ui'

interface WorkflowPromptProps {
  workflow: Workflow
  onSubmit: (args: Record<string, any>) => void
  disabled?: boolean
}

export function WorkflowPrompt({ workflow, onSubmit, disabled }: WorkflowPromptProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    positivePrompt: '',
    negativePrompt: '',
    width: 512,
    height: 512,
    steps: 20,
    cfg: 7,
    seed: -1,
  })

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Positive Prompt */}
      <Textarea
        label="Positive Prompt"
        placeholder="Describe what you want to generate..."
        rows={4}
        value={formData.positivePrompt}
        onChange={(e) => handleChange('positivePrompt', e.target.value)}
        required
      />

      {/* Negative Prompt */}
      <Textarea
        label="Negative Prompt (optional)"
        placeholder="Describe what you want to avoid..."
        rows={2}
        value={formData.negativePrompt}
        onChange={(e) => handleChange('negativePrompt', e.target.value)}
      />

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          label="Width"
          value={formData.width}
          onChange={(e) => handleChange('width', parseInt(e.target.value))}
          min="256"
          max="2048"
          step="64"
        />
        <Input
          type="number"
          label="Height"
          value={formData.height}
          onChange={(e) => handleChange('height', parseInt(e.target.value))}
          min="256"
          max="2048"
          step="64"
        />
      </div>

      {/* Generation Parameters */}
      <div className="grid grid-cols-3 gap-4">
        <Input
          type="number"
          label="Steps"
          value={formData.steps}
          onChange={(e) => handleChange('steps', parseInt(e.target.value))}
          min="1"
          max="100"
        />
        <Input
          type="number"
          label="CFG Scale"
          value={formData.cfg}
          onChange={(e) => handleChange('cfg', parseFloat(e.target.value))}
          min="1"
          max="20"
          step="0.5"
        />
        <Input
          type="number"
          label="Seed"
          placeholder="-1 for random"
          value={formData.seed}
          onChange={(e) => handleChange('seed', parseInt(e.target.value))}
        />
      </div>

      {/* Submit Button */}
      <Button type="submit" variant="primary" className="w-full" disabled={disabled}>
        {disabled ? 'Generating...' : 'Generate'}
      </Button>
    </form>
  )
}

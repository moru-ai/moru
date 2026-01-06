import { Template, TemplateClass } from '@moru-ai/core'
import HandlebarsLib from 'handlebars'
import {
  GeneratedFiles,
  Language,
  TemplateJSON,
  TemplateWithStepsJSON,
} from './types'
import typescriptTemplateSource from '../../../templates/typescript-template.hbs'
import typescriptBuildSource from '../../../templates/typescript-build.hbs'
import pythonTemplateSource from '../../../templates/python-template.hbs'
import pythonBuildAsyncSource from '../../../templates/python-build-async.hbs'
import pythonBuildSyncSource from '../../../templates/python-build-sync.hbs'
import readmeTemplateSource from '../../../templates/readme.hbs'

class Handlebars {
  private handlebars: typeof HandlebarsLib

  constructor() {
    const handlebars = HandlebarsLib.create()
    handlebars.registerHelper('eq', function (a: any, b: any, options: any) {
      if (a === b) {
        // @ts-ignore - this context is provided by Handlebars
        return options.fn(this)
      }
      return ''
    })

    handlebars.registerHelper('escapeQuotes', function (str) {
      return str ? str.replace(/'/g, "\\'") : str
    })

    handlebars.registerHelper('escapeDoubleQuotes', function (str) {
      return str ? str.replace(/"/g, '\\"') : str
    })

    this.handlebars = handlebars
  }

  compile(template: string) {
    return this.handlebars.compile(template)
  }
}

interface HandlebarStep {
  type: string
  args?: string[]
  envVars?: Record<string, string>
  src?: string
  dest?: string
}

/**
 * Transform template data for Handlebars
 */
export async function transformTemplateData(
  template: TemplateClass
): Promise<TemplateJSON & { steps: HandlebarStep[] }> {
  // Extract JSON structure from parsed template
  const jsonString = await Template.toJSON(template, false)
  const json = JSON.parse(jsonString) as TemplateWithStepsJSON

  const transformedSteps: HandlebarStep[] = []

  for (const step of json.steps) {
    switch (step.type) {
      case 'ENV': {
        // Keep all environment variables from one ENV instruction together
        const envVars: Record<string, string> = {}
        for (let i = 0; i < step.args.length; i += 2) {
          if (i + 1 < step.args.length) {
            envVars[step.args[i]] = step.args[i + 1]
          }
        }
        transformedSteps.push({
          type: 'ENV',
          envVars,
        })
        break
      }
      case 'COPY': {
        if (step.args.length >= 2) {
          const src = step.args[0]
          let dest = step.args[1]
          if (!dest || dest === '') {
            dest = '.'
          }
          transformedSteps.push({
            type: 'COPY',
            src,
            dest,
          })
        }
        break
      }
      default:
        transformedSteps.push({
          type: step.type,
          args: step.args,
        })
    }
  }

  return {
    ...json,
    steps: transformedSteps,
  }
}

/**
 * Convert the template to TypeScript code using Handlebars
 */
export async function generateTypeScriptCode(
  template: TemplateClass,
  alias: string,
  cpuCount?: number,
  memoryMB?: number
): Promise<{ templateContent: string; buildContent: string }> {
  const hb = new Handlebars()
  const transformedData = await transformTemplateData(template)

  // Load and compile templates
  const generateTemplateSource = hb.compile(typescriptTemplateSource)
  const generateBuildSource = hb.compile(typescriptBuildSource)

  // Generate content
  const templateData = {
    ...transformedData,
  }

  const templateContent = generateTemplateSource(templateData)

  const buildContent = generateBuildSource({
    alias,
    cpuCount,
    memoryMB,
  })

  return {
    templateContent: templateContent.trim(),
    buildContent: buildContent.trim(),
  }
}

/**
 * Convert the template to Python code using Handlebars
 */
export async function generatePythonCode(
  template: TemplateClass,
  alias: string,
  cpuCount?: number,
  memoryMB?: number,
  isAsync: boolean = false
): Promise<{ templateContent: string; buildContent: string }> {
  const hb = new Handlebars()
  const transformedData = await transformTemplateData(template)

  // Load and compile templates
  const templateSource = pythonTemplateSource
  const buildSource = isAsync ? pythonBuildAsyncSource : pythonBuildSyncSource

  const generateTemplateSource = hb.compile(templateSource)
  const generateBuildSource = hb.compile(buildSource)

  // Generate content
  const templateContent = generateTemplateSource({
    ...transformedData,
    isAsync,
  })

  const buildContent = generateBuildSource({
    alias,
    cpuCount,
    memoryMB,
  })

  return {
    templateContent: templateContent.trim(),
    buildContent: buildContent.trim(),
  }
}

/**
 * Generate README.md content using Handlebars
 */
export async function generateReadmeContent(
  alias: string,
  templateDir: string,
  generatedFiles: GeneratedFiles
): Promise<string> {
  const hb = new Handlebars()

  // Load and compile README template
  const generateReadmeSource = hb.compile(readmeTemplateSource)

  // Prepare template data
  const templateData = {
    alias,
    templateDir,
    templateFile: generatedFiles.templateFile,
    buildDevFile: generatedFiles.buildDevFile,
    buildProdFile: generatedFiles.buildProdFile,
    isTypeScript: generatedFiles.language === Language.TypeScript,
    isPython:
      generatedFiles.language === Language.PythonSync ||
      generatedFiles.language === Language.PythonAsync,
    isPythonSync: generatedFiles.language === Language.PythonSync,
    isPythonAsync: generatedFiles.language === Language.PythonAsync,
  }

  return generateReadmeSource(templateData).trim()
}

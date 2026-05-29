import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod to support OpenAPI metadata definitions (.openapi() method)
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);

/**
 * Enterprise OpenAPI Registry
 * Acts as the single source of truth for Zod-based OpenAPI models and schemas.
 */
export const registry = new OpenAPIRegistry();

/**
 * Generate OpenAPI components from the Zod registry.
 * This compiles all registered schemas, parameters, headers, etc. into OpenAPI v3 compliance.
 */
export function getZodOpenApiComponents() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const result = generator.generateComponents();
  return result.components || {};
}

/**
 * Helper to define standardized OpenAPI responses
 */
export const createErrorResponse = (description: string, exampleError: any) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: exampleError.message },
          errors: {
            type: 'array',
            items: { type: 'object' },
            description: 'Detailed validation errors if applicable',
          },
        },
      },
    },
  },
});

export const createSuccessResponse = (description: string, schemaName: string) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            $ref: `#/components/schemas/${schemaName}`,
          },
        },
      },
    },
  },
});

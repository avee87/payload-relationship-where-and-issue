import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    // Any Where-returning read access triggers the issue
    read: () => ({ state: { not_equals: 'hidden' } }),
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
    },
    {
      name: 'state',
      type: 'select',
      options: ['active', 'archived', 'hidden'],
      required: true,
    },
  ],
}

import { faker } from '@faker-js/faker'

export interface MockUser {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface MockSession {
  user: {
    id: string
    email: string
    name: string
  }
  expires: string
}

export interface MockTransaction {
  id: string
  date: Date
  type: 'buy' | 'sell' | 'trade'
  amount: number
  currency: string
  exchange: string
}

export interface MockPricingPlan {
  name: string
  price: {
    monthly: number
    annual: number
  }
  features: string[]
  popular?: boolean
}

export interface MockTestimonial {
  id: string
  name: string
  role: string
  company: string
  content: string
  rating: number
  avatar?: string
}

export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  id: faker.string.uuid(),
  email: faker.internet.email().toLowerCase(),
  name: faker.person.fullName(),
  createdAt: faker.date.past(),
  ...overrides,
})

export const createMockSession = (
  overrides?: Partial<MockSession>
): MockSession => {
  const user = createMockUser()
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    expires: faker.date.future().toISOString(),
    ...overrides,
  }
}

export const createMockTransaction = (
  overrides?: Partial<MockTransaction>
): MockTransaction => ({
  id: faker.string.uuid(),
  date: faker.date.past(),
  type: faker.helpers.arrayElement(['buy', 'sell', 'trade']),
  amount: faker.number.float({ min: 0.001, max: 10, fractionDigits: 8 }),
  currency: faker.helpers.arrayElement(['BTC', 'ETH', 'USDT', 'SOL']),
  exchange: faker.helpers.arrayElement([
    'Coinbase',
    'Kraken',
    'Binance',
    'Robinhood',
  ]),
  ...overrides,
})

export const createMockPricingPlan = (
  overrides?: Partial<MockPricingPlan>
): MockPricingPlan => ({
  name: faker.helpers.arrayElement(['Starter', 'Professional', 'Enterprise']),
  price: {
    monthly: faker.number.int({ min: 9, max: 99 }),
    annual: faker.number.int({ min: 90, max: 990 }),
  },
  features: [
    faker.lorem.sentence(),
    faker.lorem.sentence(),
    faker.lorem.sentence(),
  ],
  popular: faker.datatype.boolean(),
  ...overrides,
})

export const createMockTestimonial = (
  overrides?: Partial<MockTestimonial>
): MockTestimonial => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  role: faker.person.jobTitle(),
  company: faker.company.name(),
  content: faker.lorem.paragraph(),
  rating: faker.number.int({ min: 4, max: 5 }),
  avatar: faker.image.avatar(),
  ...overrides,
})

// Helper to create multiple instances
export const createMockUsers = (count: number): MockUser[] =>
  Array.from({ length: count }, () => createMockUser())

export const createMockTransactions = (count: number): MockTransaction[] =>
  Array.from({ length: count }, () => createMockTransaction())

export const createMockTestimonials = (count: number): MockTestimonial[] =>
  Array.from({ length: count }, () => createMockTestimonial())

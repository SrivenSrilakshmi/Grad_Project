import request from 'supertest';
import { createServer } from '../../src/server';
import { User } from '../../src/modules/user/user.model';
import { sign } from 'jsonwebtoken';

const app = createServer();

describe('Authentication Integration Tests', () => {
  let token: string;

  beforeAll(async () => {
    // Create a test user
    const user = await User.create({
      username: 'testuser',
      password: 'testpassword',
      role: 'USER',
    });

    // Generate a JWT token for the test user
    token = sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    // Clean up the test user
    await User.deleteMany({ username: 'testuser' });
  });

  it('should authenticate a user with valid credentials', async () => {
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
          query {
            currentUser {
              id
              username
              role
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.currentUser).toHaveProperty('username', 'testuser');
    expect(response.body.data.currentUser).toHaveProperty('role', 'USER');
  });

  it('should return an error for unauthorized access', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: `
          query {
            currentUser {
              id
              username
              role
            }
          }
        `,
      });

    expect(response.status).toBe(401);
    expect(response.body.errors[0].message).toBe('Unauthorized');
  });
});
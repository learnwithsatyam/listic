import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async create(data: { email: string; passwordHash: string; name?: string }): Promise<User> {
    const user = this.usersRepo.create({
      ...data,
      creditsRemaining: 10, // free starter credits
    });
    return this.usersRepo.save(user);
  }

  async deductCredit(userId: string): Promise<boolean> {
    const result = await this.usersRepo
      .createQueryBuilder()
      .update(User)
      .set({ creditsRemaining: () => '"creditsRemaining" - 1' })
      .where('id = :userId AND "creditsRemaining" > 0', { userId })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async addCredits(userId: string, amount: number): Promise<void> {
    await this.usersRepo
      .createQueryBuilder()
      .update(User)
      .set({ creditsRemaining: () => `"creditsRemaining" + ${Math.floor(Math.abs(amount))}` })
      .where('id = :userId', { userId })
      .execute();
  }
}

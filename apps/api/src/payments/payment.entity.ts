import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  razorpayOrderId: string;

  @Column({ unique: true })
  razorpayPaymentId: string;

  @Column()
  tierSlug: string;

  @Column()
  tierName: string;

  @Column()
  credits: number;

  @Column()
  amountPaise: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ default: 'captured' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

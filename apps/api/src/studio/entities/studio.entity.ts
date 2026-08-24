import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export type BackgroundSource = 'uploaded' | 'generated';
export type ShootStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * A reusable background plate. Either uploaded by the cafe owner or generated
 * from a text prompt — every dish in a shoot is composed onto the same one, so
 * the whole Instagram grid stays visually consistent.
 */
@Entity('studio_backgrounds')
export class StudioBackground {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'uploaded' })
  source: BackgroundSource;

  /** The text prompt used, when source is 'generated'. */
  @Column({ nullable: true, type: 'text' })
  prompt: string;

  @Column()
  imageUrl: string;

  @Column({ default: 0 })
  width: number;

  @Column({ default: 0 })
  height: number;

  @CreateDateColumn()
  createdAt: Date;
}

/** A batch of dishes photographed against one shared background. */
@Entity('food_shoots')
export class FoodShoot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  backgroundId: string;

  @ManyToOne(() => StudioBackground, { eager: true })
  @JoinColumn({ name: 'backgroundId' })
  background: StudioBackground;

  @Column()
  name: string;

  /** Slug from studio-formats.ts — square | portrait | story | landscape */
  @Column({ type: 'varchar', default: 'square' })
  format: string;

  /** Optional extra art direction applied to every dish in the shoot. */
  @Column({ nullable: true, type: 'text' })
  stylePrompt: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: ShootStatus;

  @Column({ nullable: true, type: 'varchar' })
  errorMessage: string | null;

  @OneToMany(() => FoodShot, (shot) => shot.shoot)
  shots: FoodShot[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** One dish within a shoot: the source photo and its composed result. */
@Entity('food_shots')
export class FoodShot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shootId: string;

  @ManyToOne(() => FoodShoot, (shoot) => shoot.shots)
  @JoinColumn({ name: 'shootId' })
  shoot: FoodShoot;

  @Column()
  dishName: string;

  @Column()
  sourceImageUrl: string;

  @Column({ nullable: true })
  resultImageUrl: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: ShootStatus;

  @Column({ nullable: true, type: 'varchar' })
  errorMessage: string | null;

  @Column({ nullable: true, type: 'text' })
  prompt: string;

  @Column({ default: 0 })
  width: number;

  @Column({ default: 0 })
  height: number;

  @CreateDateColumn()
  createdAt: Date;
}

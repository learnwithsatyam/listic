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

@Entity('image_projects')
export class ImageProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  originalImageUrl: string;

  @Column({ nullable: true })
  productName: string;

  @Column({ nullable: true })
  productCategory: string;

  @Column({ default: false })
  isWearable: boolean;

  @Column('simple-array', { default: '' })
  targetPlatforms: string[];

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ nullable: true })
  errorMessage: string;

  @OneToMany(() => GeneratedImage, (img) => img.project)
  generatedImages: GeneratedImage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('generated_images')
export class GeneratedImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @ManyToOne(() => ImageProject, (project) => project.generatedImages)
  @JoinColumn({ name: 'projectId' })
  project: ImageProject;

  @Column()
  imageUrl: string;

  @Column()
  imageType: string; // 'main' | 'lifestyle' | 'closeup' | 'scale' | 'angle' | 'model'

  @Column({ nullable: true })
  platform: string;

  @Column({ default: 0 })
  width: number;

  @Column({ default: 0 })
  height: number;

  @Column({ nullable: true, type: 'text' })
  prompt: string;

  @CreateDateColumn()
  createdAt: Date;
}

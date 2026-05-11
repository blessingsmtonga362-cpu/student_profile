import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('profile_data')
export class ProfileData {
 @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  registrationNumber!: string;

  @Column({default:'Pending'})
  status!: string;

  @Column({ nullable: true })
  reviewComments!: string;

}



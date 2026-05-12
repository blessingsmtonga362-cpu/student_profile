import { Role } from '../../auth/role.enum';
import { Column,Entity,PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid') 
    id !:string;

    @Column()
    firstName !: string;

    @Column()
    lastName !: string;

    @Column({ unique: true, nullable: true })
    registrationNumber?: string;

    @Column({ unique: true })
    email !: string;

    @Column()
    password !: string;

    @Column()
    university !: string;

    // Correct
@Column({ 
    type: 'enum', 
    enum: Role, 
    default: Role.User 
})
    role !: Role;
}

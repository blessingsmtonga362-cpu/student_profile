import { Role } from '../../auth/role.enum';
import { Column,Entity,PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id !:number;

    @Column()
    firstName !: string;

    @Column()
    lastName !: string;

    @Column({ unique: true })
    email !: string;

    @Column()
    password !: string;

    @Column()
    university !: string;

    @Column({ type: 'enum',enum:Role,default: Role.User })
    role !: Role;

}

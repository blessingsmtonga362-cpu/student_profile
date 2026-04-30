import { CanActivate,Injectable,ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { ROLES_KEY } from "./role.decorator";
import { Role } from "./role.enum";

@Injectable()
export class RolesGuard implements CanActivate{
  constructor(private readonly reflector: Reflector){}

  canActivate(context: ExecutionContext): boolean {
      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY,[
        context.getHandler(),
        context.getClass()
      ]);
        if(!requiredRoles){
            return true;
        }

        const {user}= context.switchToHttp().getRequest();
        return requiredRoles.some((role)=>user.role === role);
  }

}
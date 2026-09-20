import { PortableMC as Core } from "../lib";
import path from "path";

export default class PortableMC extends Core {
  override binFilepath = path.join(__dirname, "portablemc.exe");
}

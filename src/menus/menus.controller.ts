import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { MenusService } from './menus.service';

@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get()
  findAll() {
    return this.menusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menusService.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; slug: string }) {
    return this.menusService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ name: string; slug: string }>) {
    return this.menusService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }

  @Post(':id/items')
  addItem(@Param('id') menuId: string, @Body() body: any) {
    return this.menusService.addItem({ menuId, ...body });
  }

  @Put('items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body() body: any) {
    return this.menusService.updateItem(itemId, body);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string) {
    return this.menusService.removeItem(itemId);
  }
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@user/user.schema';
import { Product, ProductDocument } from './product.schema';
import {
	CreateProductDTO,
	ProductResponse,
	ProductListDTO,
	InProductResponse,
} from '@product/product.dto';

@Injectable()
export class ProductService {
	constructor(
		@InjectModel(Product.name) private productModel: Model<ProductDocument>,
		@InjectModel(User.name) private userModel: Model<UserDocument>,
	) {}

	async createProduct(
		productDTO: CreateProductDTO,
		id: string,
	): Promise<ProductResponse> {
		const product = await this.productModel.create({ ...productDTO.product, author: id });
		const productDocument = await this.productModel.findOne({ _id: product._id }).lean();
		//[ ] password 제외하고 가져옴
		const authorDocument = await this.userModel
			.findOne({ _id: id }, { password: 0 })
			.lean();
		const authorRes = {
			...authorDocument,
			followerCount: authorDocument.follower.length,
			followingCount: authorDocument.following.length,
			isfollow: false, //FIXME 추후 수정 필요
		};
		const newProduct: ProductResponse = {
			product: {
				...productDocument,
				author: authorRes,
			},
		};
		return newProduct;
	}

	async getSingleProduct(
		product: ProductDocument,
		userId: string,
	): Promise<InProductResponse> {
		const user = await this.userModel.findById(userId).lean();
		const author = await this.userModel.findById(product.author).lean();
		if (!author) {
			throw new HttpException('사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
		}
		const isfollow = author.follower.includes(user.accountname);
		const newProduct: InProductResponse = {
			...product.readOnlyData,
			author: {
				...author.readOnlyData,
				isfollow,
			},
		};
		return newProduct;
	}

	async getProducts(
		accountname: string,
		userId: string,
		limit?: number,
		skip?: number,
	): Promise<ProductListDTO> {
		const user = await this.userModel.findOne({ accountname });
		const products = await this.productModel
			.find({ author: user._id })
			.limit(limit)
			.skip(skip);

		const productsRes = await Promise.all(
			products.map(product => this.getSingleProduct(product, userId)),
		);
		return {
			data: products.length,
			product: productsRes,
		};
	}
}

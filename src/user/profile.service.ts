import { InjectModel } from '@nestjs/mongoose';
import { User } from './user.schema';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { FollowResponseDto, InfoResponseDto } from './dto/profile.dto';
import { getIsFollow } from 'src/util/helper';

@Injectable()
export class ProfileService {
	constructor(@InjectModel(User.name) private userModel: Model<User>) {}

	async getProfile(accountname: string): Promise<InfoResponseDto> {
		const user = await this.userModel.findOne({ accountname });
		if (!user) {
			throw new HttpException('해당 계정이 존재하지 않습니다.', HttpStatus.NOT_FOUND);
		}
		return {
			profile: user.readOnlyData,
		};
	}

	async follow(_id: string, accountname: string): Promise<FollowResponseDto> {
		const user = await this.userModel.findOne({ accountname });
		const myProfile = await this.userModel.findOne({ _id: _id });
		if (!user || !myProfile) {
			throw new HttpException('해당 계정이 존재하지 않습니다.', HttpStatus.NOT_FOUND);
		}

		if (!user.follower.includes(_id)) {
			user.follower.push(_id);
			await user.save();
		}
		if (!myProfile.following.includes(accountname)) {
			myProfile.following.push(accountname);
			await myProfile.save();
		}

		const userProfile = user.readOnlyData;
		userProfile.isfollow = getIsFollow(user, _id);
		return {
			profile: userProfile,
		};
	}

	async unfollow(_id: string, accountname: string): Promise<FollowResponseDto> {
		const user = await this.userModel.findOne({ accountname });
		const myProfile = await this.userModel.findOne({ _id: _id });
		if (!user || !myProfile) {
			throw new HttpException('해당 계정이 존재하지 않습니다.', HttpStatus.NOT_FOUND);
		}

		user.follower = user.follower.filter(id => id !== _id);
		await user.save();
		myProfile.following = myProfile.following.filter(id => id !== user._id);
		await myProfile.save();

		return {
			profile: user.readOnlyData,
		};
	}
}
